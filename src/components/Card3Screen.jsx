import React, { useState } from 'react';
import CardScreen from './CardScreen';
import { useDemo } from '../contexts/DemoContext';

import cardBack3 from '../assets/MainPage/chest1/back3.png';
import cardMain3 from '../assets/MainPage/chest3/main.png';
import cardton3 from '../assets/MainPage/chest3/ton.png';
import star from '../assets/MainPage/star.svg';
import tonIcon from '../assets/Ton.svg';

import item1 from '../assets/MainPage/chest3/in/3-1.png';
import item2 from '../assets/MainPage/chest3/in/3-2.png';
import item3 from '../assets/MainPage/chest3/in/3-3.png';
import item4 from '../assets/MainPage/chest3/in/3-4.png';
import item5 from '../assets/MainPage/chest3/in/3-5.png';
import item6 from '../assets/MainPage/chest3/in/3-6.png';
import item7 from '../assets/MainPage/chest3/in/3-7.png';
import item8 from '../assets/MainPage/chest3/in/3-8.png';
import item9 from '../assets/MainPage/chest3/in/3-9.png';
import item10 from '../assets/MainPage/chest3/in/3-10.png';
import item11 from '../assets/MainPage/chest3/in/3-11.png';

export default function Card3Screen({ onNavigate, currentCardIndex = 2 }) {
  const [isSwitched, setIsSwitched] = useState(false);
  const { isDemoMode } = useDemo();

  const handleCardClick = () => {
    console.log('Card 3 clicked! Opening spin page...');
    onNavigate('spin'); // Переход на страницу спина
  };

  const handleSwitchClick = () => {
    if ( isDemoMode ) return;
    setIsSwitched(!isSwitched);
  };

  // Определяем содержимое рамок
  const frameContents = [
    { img: item11, price: '1800 TON' }, // 1
    { img: item10, price: '150 TON' },  // 2
    { img: item1, price: '30 TON' },    // 3
    { img: item4, price: '26 TON' },    // 4
    { img: item2, price: '12 TON' },    // 5
    { img: item3, price: '11 TON' },    // 6
    { img: item8, price: '10 TON' },    // 7
    { img: item9, price: '7 TON' },     // 8
    { img: item5, price: '4 TON' },     // 9
    { img: cardton3, price: '2 TON' },  // 10
    { img: item7, price: '1.7 TON' },   // 11
    { img: item6, price: '1.7 TON' },   // 12
    { img: cardton3, price: '1.5 TON' },// 13
    { img: cardton3, price: '1 TON' }   // 14
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
        <div className="card-detail card-detail-2">
          <img 
            src={cardBack3}
            alt="Card 3" 
            className="card-detail-image"
            loading="lazy"
          />
          <img 
            src={cardMain3}
            alt="Main" 
            className="card-detail-main-image"
            loading="lazy"
          />
          <img 
            src={cardton3}
            alt="TON" 
            className="card-detail-ton-image"
            loading="lazy"
          />
          
          {/* Основная (правая) кнопка */}
          <div 
            className={`card-detail-button card-1-button-right card3-right ${isSwitched ? 'card3-right-switched' : ''}`} 
            onClick={handleCardClick}
          >
            <span className="card-detail-button-text">
              {isSwitched ? (
                <>
                  <img src={star} alt='star' className='card-detail-star-icon' loading='lazy'/>
                  <span className="card-detail-button-number">200</span>
                  <img src={star} alt='star' className='card-detail-star-icon' loading='lazy'/>
                </>
              ) : (
                <>
                  <span className="card-detail-button-number">4</span>
                  <span className="card-detail-button-ton">TON</span>
                </>
              )}
            </span>
          </div>
          
          {/* Переключатель (левая) кнопка */}
          <div 
            className={`card-detail-button card-1-button-left card3-left ${isSwitched ? 'card3-left-switched' : ''} ${isDemoMode ? 'card-button-disabled' : ''}`} 
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