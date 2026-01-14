import React, { useState, useEffect } from 'react';
import CardScreen from './CardScreen';
import { useDemo } from '../contexts/DemoContext';
import { useBalance } from '../contexts/BalanceContext';
import { casesApi, authApi, starsApi } from '../utils/api';

import cardBack3 from '../assets/MainPage/chest1/back3.png';
import cardMain3 from '../assets/MainPage/chest3/main.png';
import cardton3 from '../assets/MainPage/chest3/ton.png';
import star from '../assets/MainPage/star1.png';
import tonIcon from '../assets/Ton.svg';

export default function Card3Screen({ onNavigate, currentCardIndex = 2 }) {
  const [isSwitched, setIsSwitched] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [caseData, setCaseData] = useState(null);
  const [caseItems, setCaseItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isDemoMode } = useDemo();
  const { loadBalance, openTopUpModal } = useBalance();

  // Загружаем данные кейса ID: 2 (Purple Case)
  useEffect(() => {
    const loadCaseData = async () => {
      try {
        setIsLoading(true);
        console.log('🔄 Загрузка кейса ID: 2 (Purple Case)...');
        
        const response = await casesApi.getCaseById(2); // ID: 2
        console.log('✅ Данные кейса 2 (Purple):', response);
        console.log('📦 Данные кейса:', response.case);
        console.log('📦 Предметы кейса:', response.items);
        
        setCaseData(response.case);
        setCaseItems(response.items || []);
        
        if (response.items && response.items.length > 0) {
          response.items.forEach((item, index) => {
            console.log(`📊 Предмет ${index + 1}:`, {
              name: item.name,
              price_ton: item.price_ton,
              item_type: item.item_type,
              id: item.id
            });
          });
        }
        
      } catch (error) {
        console.error('❌ Error loading case 2 data:', error);
        console.error('💾 Error details:', error.response?.data);
        setCaseData({ price_ton: 4, price_stars: 400 });
        setCaseItems([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadCaseData();
  }, []);

  const handleTonClick = async () => {
    console.log('🟣 Card 3 (Purple Case) TON clicked!');
    
    if (isDemoMode) {
      console.log('🎮 Demo mode: opening spin page...');
      onNavigate('spin3');
      return;
    }
    
    if (!caseData) {
      alert('Case data not loaded. Please try again.');
      return;
    }
    
    const requiredAmount = caseData.price_ton || 4;
    console.log(`💰 Required amount: ${requiredAmount} TON`);
    
    try {
      await loadBalance();
      const userData = authApi.getCurrentUser();
      const currentBalance = userData?.balance_ton || 0;
      
      console.log(`💳 Checking balance: ${currentBalance} TON, required: ${requiredAmount} TON`);
      
      if (parseFloat(currentBalance) >= requiredAmount) {
        console.log('✅ Sufficient balance, opening case...');
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

  const handleStarClick = async () => {
    console.log('🟣 Card 3 (Purple Case) STAR clicked!');
    
    if (isDemoMode) {
      console.log('🎮 Demo mode: opening spin page...');
      onNavigate('spin3');
      return;
    }

    if (isProcessing) return;

    try {
      setIsProcessing(true);
      
      if (!caseData) {
        alert('Case data not loaded. Please try again.');
        return;
      }
      
      const starsCount = caseData.price_stars || 400;
      console.log(`⭐ Opening invoice for ${starsCount} stars...`);
      
      const invoiceData = await starsApi.createInvoice(starsCount);
      console.log('📄 Invoice created:', invoiceData);
      
      if (window.Telegram?.WebApp?.openInvoice) {
        window.Telegram.WebApp.openInvoice(invoiceData.invoice_link, (status) => {
          console.log('💳 Invoice payment status:', status);
          
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
        console.log('🌐 Opening invoice in new window (fallback)...');
        window.open(invoiceData.invoice_link, '_blank');
        
        setTimeout(() => {
          console.log('🎰 Opening case after payment simulation...');
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

  const handleOpenCase = async (currency) => {
    try {
      setIsProcessing(true);
      console.log(`🎰 Opening case ID: 2 (Purple) with currency: "${currency}"`);
      console.log(`🔍 Проверяем валюту:`, {
        value: currency,
        type: typeof currency,
        isTon: currency === 'ton',
        isStars: currency === 'stars'
      });
      
      const result = await casesApi.openCase(2, currency); // Важно: ID: 2
      console.log('✅ Case opened result:', result);
      
      if (!result) {
        console.error('❌ No result from openCase API');
        alert('Error opening case. Please try again.');
        setIsProcessing(false);
        return;
      }
      
      // Проверяем разные варианты ответа от API
      const winItem = result.win_item || result.item || null;
      
      if (!winItem) {
        console.error('❌ No win item in response:', result);
        alert('Error: No item received from case opening.');
        setIsProcessing(false);
        return;
      }
      
      console.log('🎯 Win item:', winItem);
      
      onNavigate('spin3', { 
        winItem: winItem,
        caseOpeningId: result.case_opening_id,
        inventoryAdded: result.inventory_added || false
      });
    } catch (error) {
      console.error('❌ Error opening case 2:', error);
      console.error('💾 Error response:', error.response?.data);
      console.error('💾 Error status:', error.response?.status);
      
      let errorMessage = 'Error opening case. Please try again.';
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
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

  const getFrameContents = () => {
    if (caseItems.length > 0) {
      console.log('📦 Using case items from API:', caseItems);
      return caseItems.map((item, index) => {
        let img;
        let price;
        
        if (item.item_type === 'tg_gift') {
          // Для подарков Telegram используем изображения из API
          img = getImageUrl(item.image_url);
          price = `${item.price_ton} TON`;
        } else if (item.item_type === 'reward_ton') {
          // Для TON наград используем локальную картинку
          img = cardton3;
          price = `${item.price_ton} TON`;
        } else {
          img = cardton3;
          price = '0 TON';
        }
        
        console.log(`🎨 Item ${index}:`, { img, price, item_type: item.item_type });
        return { 
          img, 
          price, 
          apiData: item,
          itemType: item.item_type,
          imageUrl: item.image_url 
        };
      });
    }
    
    console.log('⚠️ No API data, using default items');
    return Array(14).fill().map((_, index) => ({
      img: cardton3,
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
            e.target.src = cardton3; // Фолбэк на TON картинку
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
          
          <div 
            className={`card-detail-button card-1-button-right card3-right ${isSwitched ? 'card3-right-switched' : ''} ${isProcessing ? 'card-button-disabled' : ''}`} 
            onClick={isSwitched ? handleStarClick : handleTonClick}
          >
            <span className="card-detail-button-text">
              {isProcessing ? (
                <span className="processing-text">Processing...</span>
              ) : isSwitched ? (
                <>
                  <img src={star} alt='star' className='card-detail-star-icon' loading='lazy'/>
                  <span className="card-detail-button-number">
                    {caseData?.price_stars || '400'}
                  </span>
                  <img src={star} alt='star' className='card-detail-star-icon' loading='lazy'/>
                </>
              ) : (
                <>
                  <span className="card-detail-button-number">
                    {caseData?.price_ton || '4'}
                  </span>
                  <span className="card-detail-button-ton">TON</span>
                </>
              )}
            </span>
          </div>
          
          <div 
            className={`card-detail-button card-1-button-left card3-left ${isSwitched ? 'card3-left-switched' : ''} ${isDemoMode || isProcessing ? 'card-button-disabled' : ''}`}
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