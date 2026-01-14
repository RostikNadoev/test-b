import React, { useState, useEffect } from 'react';
import CardScreen from './CardScreen';
import { useDemo } from '../contexts/DemoContext';
import { useBalance } from '../contexts/BalanceContext';
import { casesApi, authApi, starsApi } from '../utils/api';

import cardBack1 from '../assets/MainPage/chest1/back.png';
import cardMain1 from '../assets/MainPage/chest1/main.png';
import cardton1 from '../assets/MainPage/chest1/ton.png';
import star from '../assets/MainPage/star1.png';
import tonIcon from '../assets/Ton.svg';

export default function Card1Screen({ onNavigate, currentCardIndex = 0 }) {
  const [isSwitched, setIsSwitched] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [caseData, setCaseData] = useState(null);
  const [caseItems, setCaseItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isDemoMode } = useDemo();
  const { loadBalance, openTopUpModal } = useBalance();

  // Загружаем данные кейса ID: 1 (Light Blue Case)
  useEffect(() => {
    const loadCaseData = async () => {
      try {
        setIsLoading(true);
        const response = await casesApi.getCaseById(1); // ID: 1
        setCaseData(response.case);
        setCaseItems(response.items || []);
        console.log('✅ Case 1 (Light Blue) data loaded:', response.case);
      } catch (error) {
        console.error('❌ Error loading case data:', error);
        // Используем дефолтные данные в случае ошибки
        setCaseData({ price_ton: 2, price_stars: 200 });
        setCaseItems([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadCaseData();
  }, []);

  // Обработка нажатия на кнопку TON
  const handleTonClick = async () => {
    console.log('Card 1 (Light Blue) TON clicked! Checking balance...');
    
    if (isDemoMode) {
      console.log('Demo mode: opening spin page...');
      // В демо режиме сразу переходим на спин
      onNavigate('spin1');
      return;
    }
    
    if (!caseData) {
      alert('Case data not loaded. Please try again.');
      return;
    }
    
    const requiredAmount = caseData.price_ton || 2;
    
    try {
      await loadBalance();
      const userData = authApi.getCurrentUser();
      const currentBalance = userData?.balance_ton || 0;
      
      console.log(`Checking balance: ${currentBalance} TON, required: ${requiredAmount} TON`);
      
      if (parseFloat(currentBalance) >= requiredAmount) {
        await handleOpenCase('ton');
      } else {
        console.log('❌ Insufficient balance, showing top-up modal');
        const missingAmount = requiredAmount - parseFloat(currentBalance);
        openTopUpModal(missingAmount);
        alert(`Insufficient balance. You need ${requiredAmount} TON to open this chest. Current balance: ${currentBalance.toFixed(2)} TON`);
      }
    } catch (error) {
      console.error('❌ Error checking balance:', error);
      alert('Error checking balance. Please try again.');
    }
  };

  // Обработка нажатия на кнопку STAR
  const handleStarClick = async () => {
    if (isDemoMode) {
      console.log('Demo mode: skipping payment, opening spin page...');
      // В демо режиме сразу переходим на спин
      onNavigate('spin1');
      return;
    }

    if (isProcessing) return;

    try {
      setIsProcessing(true);
      
      if (!caseData) {
        alert('Case data not loaded. Please try again.');
        return;
      }
      
      const starsCount = caseData.price_stars || 200;
      console.log(`Opening invoice for ${starsCount} stars...`);
      
      const invoiceData = await starsApi.createInvoice(starsCount);
      
      if (window.Telegram?.WebApp?.openInvoice) {
        window.Telegram.WebApp.openInvoice(invoiceData.invoice_link, (status) => {
          console.log('Invoice payment status:', status);
          
          if (status === 'paid') {
            loadBalance().then(() => {
              console.log('✅ Payment successful! Opening case...');
              handleOpenCase('stars');
            }).catch(error => {
              console.error('Error updating balance:', error);
              handleOpenCase('stars');
            });
          } else if (status === 'failed' || status === 'cancelled') {
            console.log('❌ Payment failed or cancelled');
            alert('Payment was cancelled or failed. Please try again.');
          }
          setIsProcessing(false);
        });
      } else {
        console.log('Opening invoice in new window (fallback)...');
        window.open(invoiceData.invoice_link, '_blank');
        
        setTimeout(() => {
          console.log('Opening case after payment simulation...');
          handleOpenCase('stars');
          setIsProcessing(false);
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Error opening invoice:', error);
      alert('Error creating payment invoice. Please try again.');
      setIsProcessing(false);
    }
  };

  // Функция для открытия кейса
  const handleOpenCase = async (currency) => {
    try {
      setIsProcessing(true);
      console.log(`🔄 Opening case 1 with currency: "${currency}"`);
      console.log(`🔍 Currency проверка:`, {
        value: currency,
        type: typeof currency,
        isTon: currency === 'ton',
        isStars: currency === 'stars'
      });
      
      const result = await casesApi.openCase(1, currency);
      console.log('✅ Case opened result:', result);
      
      // Добавляем небольшую задержку перед переходом
      setTimeout(() => {
        onNavigate('spin1', { 
          winItem: result.win_item,
          caseOpeningId: result.case_opening_id,
          inventoryAdded: result.inventory_added
        });
      }, 0); // Задержка 0мс
      
    } catch (error) {
      console.error('❌ Error opening case:', error);
      console.error('💾 Error details:', error.response?.data);
      alert('Error opening case. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleSwitchClick = () => {
    if (isDemoMode) return;
    setIsSwitched(!isSwitched);
  };

  // Функция для получения URL изображения из API
  const getImageUrl = (imagePath) => {
    if (!imagePath) return '';
    
    // Если это статические файлы бэкенда, добавляем базовый URL
    if (imagePath.startsWith('/static/')) {
      return `${import.meta.env.VITE_BACKEND_URL || ''}${imagePath}`;
    }
    
    return imagePath;
  };

  // Определяем содержимое рамок из данных API
  const getFrameContents = () => {
    if (caseItems.length > 0) {
      return caseItems.map((item, index) => {
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
        
        return { img, price, itemType: item.item_type, imageUrl: item.image_url };
      });
    }
    
    // Дефолтное содержимое если API не вернул данные
    return Array(15).fill().map((_, index) => ({
      img: cardton1,
      price: '0 TON',
      itemType: 'reward_ton'
    }));
  };

  const frameContents = getFrameContents();

  const getPriceClass = (priceStr) => {
    const priceValue = parseFloat(priceStr.replace(/[^\d.-]/g, ''));
    if (priceValue >= 501) return 'item-price-gradient-3';
    if (priceValue >= 51) return 'item-price-gradient-2';
    if (priceValue >= 11) return 'item-price-gradient-1';
    return 'item-price';
  };

  const frames = frameContents.map((content, index) => (
    <div key={index} className="item-frame">
      <div className="item-content">
        <img 
          src={content.img} 
          alt={`Item ${index + 1}`} 
          className="item-image"
          loading="lazy"
          onError={(e) => {
            console.error(`Failed to load image: ${content.imageUrl}`);
            e.target.src = cardton1; // Фолбэк на TON картинку
          }}
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
          
          <div 
            className={`card-detail-button card-1-button-right card1-right ${isSwitched ? 'card1-right-switched' : ''} ${isProcessing ? 'card-button-disabled' : ''}`} 
            onClick={isSwitched ? handleStarClick : handleTonClick}
          >
            <span className="card-detail-button-text">
              {isProcessing ? (
                <span className="processing-text">Processing...</span>
              ) : isSwitched ? (
                <>
                  <img src={star} alt='star' className='card-detail-star-icon' loading='lazy'/>
                  <span className="card-detail-button-number">
                    {caseData?.price_stars || '200'}
                  </span>
                  <img src={star} alt='star' className='card-detail-star-icon' loading='lazy'/>
                </>
              ) : (
                <>
                  <span className="card-detail-button-number">
                    {caseData?.price_ton || '2'}
                  </span>
                  <span className="card-detail-button-ton">TON</span>
                </>
              )}
            </span>
          </div>
          
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

        <div className="items-container">
          {isLoading ? (
            <div className="loading-items">
              <div className="spinner"></div>
              <p>Loading items...</p>
            </div>
          ) : (
            frames
          )}
        </div>
        
        <div className="blur-overlay"></div>
      </div>
    </CardScreen>
  );
}