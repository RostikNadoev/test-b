import React, { useState, useEffect } from 'react';
import CardScreen from './CardScreen';
import { useDemo } from '../contexts/DemoContext';
import { useBalance } from '../contexts/BalanceContext';
import { casesApi, authApi } from '../utils/api';

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
  const { balances, checkBalance, loadBalances } = useBalance();

  // Загружаем данные кейса ID: 1 (Light Blue Case)
  useEffect(() => {
    const loadCaseData = async () => {
      try {
        setIsLoading(true);
        const response = await casesApi.getCaseById(1);
        setCaseData(response.case);
        setCaseItems(response.items || []);
        console.log('✅ Case 1 data loaded:', response.case);
      } catch (error) {
        console.error('❌ Error loading case data:', error);
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
    console.log('Card 1 TON clicked! Checking balance...');
    
    if (isDemoMode) {
      console.log('Demo mode: opening spin page...');
      onNavigate('spin1', { isDemo: true });
      return;
    }
    
    if (!caseData) {
      alert('Case data not loaded. Please try again.');
      return;
    }
    
    const requiredAmount = caseData.price_ton || 2;
    
    try {
      // Загружаем свежие балансы
      await loadBalances();
      
      // Проверяем баланс
      if (checkBalance('ton', requiredAmount)) {
        await handleOpenCase('ton');
      } else {
        console.log('❌ Insufficient balance');
        const userData = authApi.getCurrentUser();
        const currentBalance = balances.ton || 0;
        alert(`Insufficient balance. You need ${requiredAmount} TON to open this chest. Current balance: ${currentBalance.toFixed(2)} TON`);
      }
    } catch (error) {
      console.error('❌ Error checking balance:', error);
      alert('Error checking balance. Please try again.');
    }
  };

  const handleStarClick = async () => {
    if (isDemoMode) {
      console.log('Demo mode: opening spin page...');
      onNavigate('spin1', { isDemo: true });
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
      console.log(`Opening case for ${starsCount} stars...`);
      
      // Проверяем баланс звезд
      if (checkBalance('stars', starsCount)) {
        // Если хватает звезд, открываем кейс
        await handleOpenCase('stars');
      } else {
        // Если не хватает, показываем alert
        alert(`Insufficient stars balance. You need ${starsCount} stars to open this chest. Current balance: ${balances.stars || 0}`);
        setIsProcessing(false);
      }
      
    } catch (error) {
      console.error('❌ Error with stars:', error);
      alert('Error checking stars balance. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleOpenCase = async (currency) => {
    try {
      setIsProcessing(true);
      console.log(`🔄 Opening case 1 with currency: "${currency}"`);
      
      // 1. ОТПРАВЛЯЕМ ЗАПРОС НА ОТКРЫТИЕ КЕЙСА
      const result = await casesApi.openCase(1, currency);
      console.log('✅ Case opened result:', result);
      
      // 2. ИЩЕМ ПОЛНЫЕ ДАННЫЕ ПРЕДМЕТА В caseItems ПО index
      const apiItem = result.item;
      console.log('🔍 API item from open:', apiItem);
      console.log('📦 Available case items:', caseItems);
      
      let fullItemData = null;
      
      // Ищем полный предмет в caseItems по index
      if (caseItems.length > 0 && apiItem.index) {
        // Ищем предмет по item_index (сопоставляем с apiItem.index)
        fullItemData = caseItems.find(item => 
          item.item_index === apiItem.index || 
          item.index === apiItem.index
        );
        
        console.log('🔍 Found full item data:', fullItemData);
      }
      
      // 3. СОЗДАЕМ ВЫИГРЫШНЫЙ ПРЕДМЕТ С ПОЛНЫМИ ДАННЫМИ
      let img = cardton1;
      let price = '0 TON';
      let name = apiItem.name || 'Reward';
      
      // Если нашли полные данные предмета в caseItems
      if (fullItemData) {
        // Используем изображение из полных данных
        if (fullItemData.image_url) {
          img = getImageUrl(fullItemData.image_url);
        }
        
        // Используем цену из полных данных
        if (fullItemData.price_ton !== undefined) {
          price = `${fullItemData.price_ton} TON`;
        }
        
        // Используем имя из полных данных если есть
        if (fullItemData.name) {
          name = fullItemData.name;
        }
      } else {
        // Если полных данных нет, используем то что есть в apiItem
        if (apiItem.image_url) {
          img = getImageUrl(apiItem.image_url);
        }
        
        // Для TON наград используем имя как цену
        if (apiItem.item_type === 'reward_ton' && apiItem.name) {
          const match = apiItem.name.match(/(\d+(\.\d+)?)\s*TON/);
          if (match) {
            price = `${match[1]} TON`;
          } else {
            price = apiItem.name;
          }
        }
      }
      
      // 4. Формируем winData ДЛЯ ПЕРЕДАЧИ В Spin1Screen
      const winData = {
        winningItem: {
          // Основные поля для отображения
          img: img,
          price: price,
          name: name,
          
          // Данные из API
          item_type: apiItem.item_type,
          index: apiItem.index,
          rarity: apiItem.rarity,
          
          // Полные данные если есть
          image_url: fullItemData?.image_url || apiItem.image_url,
          price_ton: fullItemData?.price_ton,
          id: fullItemData?.id,
          
          // Флаг что это из API
          fromApi: true,
          fullDataFound: !!fullItemData
        },
        apiResponse: result,
        fullItemData: fullItemData // Дополнительно передаем полные данные
      };
      
      console.log('🎯 Formatted winData for Spin1Screen:', winData);
      
      // 5. Переходим на спин-скрин ПЕРЕДАВАЯ winData КАК ОБЪЕКТ
      console.log('➡️ Navigating to spin1 with winData as object');
      onNavigate('spin1', { winData }); // ✅ ВАЖНО: передаем объект с ключом winData
      
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
    if (!imagePath) return cardton1;
    
    if (imagePath.startsWith('/static/')) {
      return `${import.meta.env.VITE_BACKEND_URL || ''}${imagePath}`;
    }
    
    // Если пустая строка, возвращаем cardton1
    if (imagePath.trim() === '') {
      return cardton1;
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
          img = getImageUrl(item.image_url);
          price = `${item.price_ton} TON`;
        } else if (item.item_type === 'reward_ton') {
          img = cardton1;
          price = `${item.price_ton} TON`;
        } else {
          img = cardton1;
          price = '0 TON';
        }
        
        return { 
          img, 
          price, 
          itemType: item.item_type, 
          imageUrl: item.image_url,
          id: item.id,
          index: item.index,
          name: item.name,
          originalItem: item
        };
      });
    }
    
    return Array(15).fill().map((_, index) => ({
      img: cardton1,
      price: '0 TON',
      itemType: 'reward_ton',
      id: index,
      index: `default_${index}`,
      name: 'Default Item'
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
            e.target.src = cardton1;
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