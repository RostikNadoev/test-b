// components/Card2Screen.jsx
import React, { useState, useEffect } from 'react';
import CardScreen from './CardScreen';
import { useDemo } from '../contexts/DemoContext';
import { useBalance } from '../contexts/BalanceContext';
import { casesApi, authApi, starsApi } from '../utils/api';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [caseData, setCaseData] = useState(null);
  const [caseItems, setCaseItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isDemoMode } = useDemo();
  const { loadBalance, openTopUpModal } = useBalance();

  // Загружаем данные кейса ID: 3 (Blue Case)
  useEffect(() => {
    const loadCaseData = async () => {
      try {
        setIsLoading(true);
        const response = await casesApi.getCaseById(3); // ID: 3
        setCaseData(response.case);
        setCaseItems(response.items || []);
        console.log('✅ Case 3 (Blue) data loaded:', response.case);
      } catch (error) {
        console.error('❌ Error loading case data:', error);
        setCaseData({ price_ton: 5, price_stars: 500 });
        setCaseItems([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadCaseData();
  }, []);

  // Обработка нажатия на кнопку TON
  const handleTonClick = async () => {
    console.log('Card 2 (Blue) TON clicked! Checking balance...');
    
    if (isDemoMode) {
      console.log('Demo mode: opening spin page...');
      onNavigate('spin2');
      return;
    }
    
    if (!caseData) {
      alert('Case data not loaded. Please try again.');
      return;
    }
    
    const requiredAmount = caseData.price_ton || 5;
    
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
      onNavigate('spin2');
      return;
    }

    if (isProcessing) return;

    try {
      setIsProcessing(true);
      
      if (!caseData) {
        alert('Case data not loaded. Please try again.');
        return;
      }
      
      const starsCount = caseData.price_stars || 500;
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
  const handleOpenCase = async (paymentMethod) => {
    try {
      setIsProcessing(true);
      console.log(`Opening case 3 (Blue) with ${paymentMethod}...`);
      
      const result = await casesApi.openCase(3, paymentMethod); // ID: 3
      console.log('✅ Case opened result:', result);
      
      onNavigate('spin2', { 
        winItem: result.win_item,
        caseOpeningId: result.case_opening_id,
        inventoryAdded: result.inventory_added
      });
    } catch (error) {
      console.error('❌ Error opening case:', error);
      alert('Error opening case. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleSwitchClick = () => {
    if (isDemoMode) return;
    setIsSwitched(!isSwitched);
  };

  const getFrameContents = () => {
    if (caseItems.length > 0) {
      return caseItems.map((item, index) => {
        let img;
        let price;
        
        if (item.item_type === 'tg_gift') {
          const itemImages = [
            item1, item2, item3, item4, item5, 
            item6, item7, item8, item9, item10
          ];
          img = itemImages[index % itemImages.length] || cardton2;
          price = `${item.price_ton} TON`;
        } else if (item.item_type === 'reward_ton') {
          img = cardton2;
          price = `${item.price_ton} TON`;
        } else {
          img = cardton2;
          price = '0 TON';
        }
        
        return { img, price };
      });
    }
    
    return [
      { img: item1, price: '6500 TON' },
      { img: item2, price: '1000 TON' },
      { img: item3, price: '80 TON' },
      { img: item4, price: '65 TON' },
      { img: item5, price: '30 TON' },
      { img: item6, price: '5 TON' },
      { img: item7, price: '3 TON' },
      { img: item8, price: '1.7 TON' },
      { img: item9, price: '1.7 TON' },
      { img: item10, price: '1.7 TON' },
      { img: cardton2, price: '1.5 TON' },
      { img: cardton2, price: '1 TON' },
      { img: cardton2, price: '0.5 TON' }
    ];
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
          
          <div 
            className={`card-detail-button card-1-button-right card2-right ${isSwitched ? 'card2-right-switched' : ''} ${isProcessing ? 'card-button-disabled' : ''}`} 
            onClick={isSwitched ? handleStarClick : handleTonClick}
          >
            <span className="card-detail-button-text">
              {isProcessing ? (
                <span className="processing-text">Processing...</span>
              ) : isSwitched ? (
                <>
                  <img src={star} alt='star' className='card-detail-star-icon' loading='lazy'/>
                  <span className="card-detail-button-number">
                    {caseData?.price_stars || '500'}
                  </span>
                  <img src={star} alt='star' className='card-detail-star-icon' loading='lazy'/>
                </>
              ) : (
                <>
                  <span className="card-detail-button-number">
                    {caseData?.price_ton || '5'}
                  </span>
                  <span className="card-detail-button-ton">TON</span>
                </>
              )}
            </span>
          </div>
          
          <div 
            className={`card-detail-button card-1-button-left card2-left ${isSwitched ? 'card2-left-switched' : ''} ${isDemoMode || isProcessing ? 'card-button-disabled' : ''}`}
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
          {frames}
        </div>
        
        <div className="blur-overlay"></div>
      </div>
    </CardScreen>
  );
}