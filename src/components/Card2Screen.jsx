import React, { useState } from 'react';
import CardScreen from './CardScreen';
import cardBack2 from '../assets/MainPage/chest1/back2.png';
import cardMain2 from '../assets/MainPage/chest2/main.png';
import cardton2 from '../assets/MainPage/chest2/ton.png';
import star from '../assets/MainPage/star.svg';
import tonIcon from '../assets/Ton.svg';

import item1 from '../assets/MainPage/chest2/in/2-1.png';
import item2 from '../assets/MainPage/chest2/in/2-2.png';
import item3 from '../assets/MainPage/chest2/in/2-3.png';
import item4 from '../assets/MainPage/chest2/in/2-4.png';
import item5 from '../assets/MainPage/chest2/in/2-5.png';
import item6 from '../assets/MainPage/chest2/in/2-6.png';
import item7 from '../assets/MainPage/chest2/in/2-7.png';
import item8 from '../assets/MainPage/chest2/in/2-8.png';
import item9 from '../assets/MainPage/chest2/in/2-9.png';
import item10 from '../assets/MainPage/chest2/in/2-10.png';

export default function Card2Screen({ onNavigate, currentCardIndex = 1 }) {
  const [isSwitched, setIsSwitched] = useState(false);

  const handleCardClick = () => {
    console.log('Card 2 clicked! Opening spin page...');
    onNavigate('spin2'); // Переход на страницу спина 2
  };

  const handleSwitchClick = () => {
    setIsSwitched(!isSwitched);
  };

  // Определяем содержимое рамок для карты 2
  const frameContents = [
    { img: item1, price: '6500 TON' }, // 1
    { img: item2, price: '1000 TON' }, // 2
    { img: item3, price: '80 TON' },   // 3
    { img: item4, price: '65 TON' },   // 4
    { img: item5, price: '30 TON' },   // 5
    { img: item6, price: '5 TON' },    // 6
    { img: item7, price: '3 TON' },    // 7
    { img: item8, price: '1.7 TON' },  // 8
    { img: item9, price: '1.7 TON' },  // 9
    { img: item10, price: '1.7 TON' }, // 10
    { img: cardton2, price: '1.5 TON' },// 11
    { img: cardton2, price: '1 TON' }, // 12
    { img: cardton2, price: '0.5 TON' }  // 13
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
        <div className="card-detail card-detail-1">
          <img 
            src={cardBack2}
            alt="Card 2" 
            className="card-detail-image"
            loading="lazy"
          />
          <img 
            src={cardMain2}
            alt="Main" 
            className="card-detail-main-image"
            loading="lazy"
          />
          <img 
            src={cardton2}
            alt="TON" 
            className="card-detail-ton-image"
            loading="lazy"
          />
          
          {/* Основная (правая) кнопка */}
          <div 
            className={`card-detail-button card-1-button-right card2-right ${isSwitched ? 'card2-right-switched' : ''}`} 
            onClick={handleCardClick}
          >
            <span className="card-detail-button-text">
              {isSwitched ? (
                <>
                  <img src={star} alt='star' className='card-detail-star-icon' loading='lazy'/>
                  <span className="card-detail-button-number">150</span>
                  <img src={star} alt='star' className='card-detail-star-icon' loading='lazy'/>
                </>
              ) : (
                <>
                  <span className="card-detail-button-number">5</span>
                  <span className="card-detail-button-ton">TON</span>
                </>
              )}
            </span>
          </div>
          
          {/* Переключатель (левая) кнопка */}
          <div 
            className={`card-detail-button card-1-button-left card2-left ${isSwitched ? 'card2-left-switched' : ''}`} 
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