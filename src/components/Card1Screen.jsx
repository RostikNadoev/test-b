import React, { useState, useEffect } from 'react';
import CardScreen from './CardScreen';
import { useDemo } from '../contexts/DemoContext';
import { useBalance } from '../contexts/BalanceContext'; // 🔥 Используем контекст баланса
import { starsApi, authApi } from '../utils/api';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const { isDemoMode } = useDemo();
  const { balance, checkBalance, openTopUpModal, loadBalance } = useBalance(); // 🔥 Используем функции баланса

  // 🔥 Обработка нажатия на кнопку 0.1 TON (проверяем баланс)
  const handleTonClick = async () => {
    console.log('Card 1 TON clicked! Checking balance...');
    
    if (isDemoMode) {
      console.log('Demo mode: opening spin page...');
      onNavigate('spin1');
      return;
    }
    
    const requiredAmount = 0.1; // Сумма, необходимая для входа
    
    try {
      // Загружаем актуальный баланс
      await loadBalance();
      
      // Проверяем достаточно ли баланса
      const userData = authApi.getCurrentUser();
      const currentBalance = userData?.balance_ton || 0;
      
      console.log(`Checking balance: ${currentBalance} TON, required: ${requiredAmount} TON`);
      
      if (parseFloat(currentBalance) >= requiredAmount) {
        // Баланс достаточен - открываем спин
        console.log('✅ Sufficient balance, opening spin page...');
        onNavigate('spin1');
        
        // 🔥 TODO: Здесь можно вычесть сумму со счета пользователя
        // после успешного открытия спина
        
      } else {
        // Баланс недостаточен - показываем пополнение
        console.log('❌ Insufficient balance, showing top-up modal');
        const missingAmount = requiredAmount - parseFloat(currentBalance);
        
        // Используем контекст баланса для открытия модалки пополнения
        openTopUpModal(missingAmount);
        
        // Показываем сообщение
        alert(`Insufficient balance. You need ${requiredAmount} TON to open this chest. Current balance: ${currentBalance.toFixed(2)} TON`);
      }
      
    } catch (error) {
      console.error('❌ Error checking balance:', error);
      alert('Error checking balance. Please try again.');
    }
  };

  // 🔥 Обработка нажатия на кнопку 1 STAR
  // 🔥 Обработка нажатия на кнопку 1 STAR
const handleStarClick = async () => {
  if (isDemoMode) {
    console.log('Demo mode: skipping payment, opening spin page...');
    onNavigate('spin1');
    return;
  }

  if (isProcessing) return;

  try {
    setIsProcessing(true);
    console.log('Opening invoice for 1 star...'); // ⚠️ Убрали "(1000 XTR)"
    
    // Создаем инвойс для 1 звезды
    const invoiceData = await starsApi.createInvoice(1); // 1 звезда = 1 (без умножения)
    
    // ... остальной код без изменений
      
      // Открываем инвойс через Telegram WebApp
      if (window.Telegram?.WebApp?.openInvoice) {
        // Используем Telegram WebApp API для открытия инвойса
        window.Telegram.WebApp.openInvoice(invoiceData.invoice_link, (status) => {
          console.log('Invoice payment status:', status);
          
          if (status === 'paid') {
            // Успешная оплата - обновляем баланс и открываем спин
            console.log('✅ Payment successful! Updating user data...');
            
            // Обновляем баланс через контекст
            loadBalance().then(() => {
              console.log('✅ Balance updated, opening spin page...');
              onNavigate('spin1');
            }).catch(error => {
              console.error('Error updating balance:', error);
              onNavigate('spin1'); // Все равно открываем спин
            });
            
          } else if (status === 'failed' || status === 'cancelled') {
            console.log('❌ Payment failed or cancelled');
            alert('Payment was cancelled or failed. Please try again.');
          }
          
          setIsProcessing(false);
        });
      } else {
        // Fallback для браузера - открываем ссылку в новом окне
        console.log('Opening invoice in new window (fallback)...');
        window.open(invoiceData.invoice_link, '_blank');
        
        // В демо или для теста - сразу открываем спин
        setTimeout(() => {
          console.log('Opening spin page after payment simulation...');
          onNavigate('spin1');
          setIsProcessing(false);
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Error opening invoice:', error);
      alert('Error creating payment invoice. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleSwitchClick = () => {
    if (isDemoMode) return;
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
    const priceValue = parseFloat(priceStr.replace(/[^\d.-]/g, ''));

    if (priceValue >= 501) {
      return 'item-price-gradient-3';
    } else if (priceValue >= 51) {
      return 'item-price-gradient-2';
    } else if (priceValue >= 11) {
      return 'item-price-gradient-1';
    } else {
      return 'item-price';
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

  // 🔥 Добавляем слушатель для открытия модалки пополнения
  useEffect(() => {
    const handleOpenTopUpModal = (e) => {
      console.log('Received openTopUpModal event:', e.detail);
      // Используем контекст для открытия модалки
      if (e.detail?.defaultAmount) {
        openTopUpModal(e.detail.defaultAmount);
      }
    };

    window.addEventListener('openTopUpModal', handleOpenTopUpModal);
    
    return () => {
      window.removeEventListener('openTopUpModal', handleOpenTopUpModal);
    };
  }, [openTopUpModal]);

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
            className={`card-detail-button card-1-button-right card1-right ${isSwitched ? 'card1-right-switched' : ''} ${isProcessing ? 'card-button-disabled' : ''}`} 
            onClick={isSwitched ? handleStarClick : handleTonClick}
          >
            <span className="card-detail-button-text">
              {isSwitched ? (
                isProcessing ? (
                  <span className="processing-text">
                    Processing...
                  </span>
                ) : (
                  <>
                    <img src={star} alt='star' className='card-detail-star-icon' loading='lazy'/>
                    <span className="card-detail-button-number">1</span>
                    <img src={star} alt='star' className='card-detail-star-icon' loading='lazy'/>
                  </>
                )
              ) : (
                <>
                  <span className="card-detail-button-number">0.1</span>
                  <span className="card-detail-button-ton">TON</span>
                </>
              )}
            </span>
          </div>
          
          {/* Переключатель (левая) кнопка */}
          <div 
            className={`card-detail-button card-1-button-left card1-left ${isSwitched ? 'card1-left-switched' : ''} ${isDemoMode || isProcessing ? 'card-button-disabled' : ''}`}
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