import React, { useState, useEffect } from 'react';
import CardScreen from './CardScreen';
import { useDemo } from '../contexts/DemoContext';
import { useBalance } from '../contexts/BalanceContext';
import { casesApi } from '../utils/api';

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
  const { balances, checkBalance, loadBalances } = useBalance();

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
      onNavigate('spin3', { isDemo: true });
      return;
    }
    
    if (!caseData) {
      alert('Case data not loaded. Please try again.');
      return;
    }
    
    const requiredAmount = caseData.price_ton || 4;
    console.log(`💰 Required amount: ${requiredAmount} TON`);
    
    try {
      // Загружаем свежие балансы
      await loadBalances();
      
      // Проверяем баланс
      if (checkBalance('ton', requiredAmount)) {
        console.log('✅ Sufficient balance, opening case...');
        await handleOpenCase('ton');
      } else {
        console.log('❌ Insufficient balance');
        const currentBalance = balances.ton || 0;
        alert(`Insufficient balance. You need ${requiredAmount} TON to open this chest. Current balance: ${currentBalance.toFixed(2)} TON`);
      }
    } catch (error) {
      console.error('❌ Error checking balance:', error);
      alert('Error checking balance. Please try again.');
    }
  };

  // Обработка нажатия на кнопку STAR
  const handleStarClick = async () => {
    console.log('🟣 Card 3 (Purple Case) STAR clicked!');
    
    if (isDemoMode) {
      console.log('🎮 Demo mode: opening spin page...');
      onNavigate('spin3', { isDemo: true });
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
      console.log(`🎰 Opening case ID: 2 (Purple) with currency: "${currency}"`);
      
      const result = await casesApi.openCase(2, currency); // ID: 2
      console.log('✅ Case opened result:', result);
      
      if (!result) {
        console.error('❌ No result from openCase API');
        alert('Error opening case. Please try again.');
        setIsProcessing(false);
        return;
      }
      
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
      let img = cardton3;
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
      
      // 4. Формируем winData ДЛЯ ПЕРЕДАЧИ В Spin3Screen
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
        fullItemData: fullItemData
      };
      
      console.log('🎯 Formatted winData for Spin3Screen:', winData);
      
      // 5. Переходим на спин-скрин ПЕРЕДАВАЯ winData КАК ОБЪЕКТ
      console.log('➡️ Navigating to spin3 with winData as object');
      onNavigate('spin3', { winData });
      
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
    if (!imagePath) return cardton3;
    
    if (imagePath.startsWith('/static/')) {
      return `${import.meta.env.VITE_BACKEND_URL || ''}${imagePath}`;
    }
    
    return imagePath;
  };

  const getFrameContents = () => {
    if (caseItems.length > 0) {
      console.log('📦 Using case items from API:', caseItems);
      return caseItems.map((item, index) => {
        let img = cardton3;
        let price = '0 TON';
        
        if (item.item_type === 'tg_gift') {
          img = getImageUrl(item.image_url);
          price = `${item.price_ton} TON`;
        } else if (item.item_type === 'reward_ton') {
          price = `${item.price_ton} TON`;
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
    
    console.log('⚠️ No API data, using default items');
    return Array(14).fill().map((_, index) => ({
      img: cardton3,
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
            e.target.src = cardton3;
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