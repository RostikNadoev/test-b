import { useState, useEffect } from 'react';
import '../styles/CaseModal.css';
import { casesApi } from '../utils/api';
import { useDemo } from '../contexts/DemoContext';
import { useBalance } from '../contexts/BalanceContext';

// Импортируем иконки
import tonIcon from '../assets/MainPage/cases/tonicon.png';
import starsIcon from '../assets/MainPage/cases/starsicon.png';
import cardton1 from '../assets/MainPage/chest1/ton.png';

// Импортируем фоны для рамок
import back1 from '../assets/MainPage/cases/back1case.png';
import back2 from '../assets/MainPage/chest1/back.png';
import back3 from '../assets/MainPage/cases/back3case.png';
import back4 from '../assets/MainPage/cases/back4case.png';
import back5 from '../assets/MainPage/cases/back5case.png';
import back6 from '../assets/MainPage/cases/back6case.png';

// Демо-цены для кейсов
const DEMO_CASE_PRICES = {
  1: { ton: 0, stars: 0 },
  2: { ton: 1, stars: 100 },
  3: { ton: 3, stars: 300 },
  4: { ton: 5, stars: 500 },
  5: { ton: 10, stars: 1000 },
  6: { ton: 15, stars: 1500 }
};

export default function CaseModal({ caseItem, onClose, onNavigate }) {
  const [caseData, setCaseData] = useState(null);
  const [caseItems, setCaseItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { isDemoMode, demoBalance, removeFromDemoBalance } = useDemo();
  const { balances, checkBalance, loadBalances } = useBalance();

  // Функция для получения цены кейса
  const getCasePrice = () => {
    // В демо-режиме используем демо-цены
    if (isDemoMode) {
      return DEMO_CASE_PRICES[caseItem.id] || { ton: 0, stars: 0 };
    }
    
    // В реальном режиме сначала из caseData, потом из caseItem
    if (caseData?.price_ton !== undefined) {
      return {
        ton: caseData.price_ton,
        stars: caseData.price_stars
      };
    }
    
    if (caseItem.price?.ton !== undefined) {
      return caseItem.price;
    }
    
    if (caseItem.price_ton !== undefined) {
      return {
        ton: caseItem.price_ton,
        stars: caseItem.price_stars
      };
    }
    
    return DEMO_CASE_PRICES[caseItem.id] || { ton: 0, stars: 0 };
  };

  // Функция для получения класса заголовка в зависимости от ID кейса
  const getTitleClass = () => {
    const caseId = caseItem.id;
    switch(caseId) {
      case 1: return 'modal-title modal-title-case1';
      case 2: return 'modal-title modal-title-case2';
      case 3: return 'modal-title modal-title-case3';
      case 4: return 'modal-title modal-title-case4';
      case 5: return 'modal-title modal-title-case5';
      case 6: return 'modal-title modal-title-case6';
      default: return 'modal-title';
    }
  };

  // Функция для получения класса подписи WHAT'S INSIDE
  const getLabelClass = () => {
    const caseId = caseItem.id;
    switch(caseId) {
      case 1: return 'modal-items-label modal-label-case1';
      case 2: return 'modal-items-label modal-label-case2';
      case 3: return 'modal-items-label modal-label-case3';
      case 4: return 'modal-items-label modal-label-case4';
      case 5: return 'modal-items-label modal-label-case5';
      case 6: return 'modal-items-label modal-label-case6';
      default: return 'modal-items-label';
    }
  };

  // Функция для получения фона рамки в зависимости от ID кейса
  const getFrameBackground = () => {
    const caseId = caseItem.id;
    
    switch(caseId) {
      case 1: return back1;
      case 2: return back2;
      case 3: return back3;
      case 4: return back4;
      case 5: return back5;
      case 6: return back6;
      default: return back1;
    }
  };

 // Функция для обрезания цены (без округления)
const formatPrice = (priceStr) => {
  const priceValue = parseFloat(priceStr.replace(/[^\d.-]/g, ''));
  const currency = priceStr.includes('TON') ? ' TON' : '';
  
  if (priceValue >= 100) {
    // Преобразуем в строку и обрезаем до 1 знака после запятой БЕЗ округления
    const priceString = priceValue.toString();
    const [wholePart, decimalPart] = priceString.split('.');
    
    if (decimalPart) {
      // Если есть десятичная часть, берем только первый знак (обрезаем, не округляем)
      return `${wholePart}.${decimalPart.substring(0, 1)}${currency}`;
    } else {
      // Если целое число
      return `${wholePart}${currency}`;
    }
  }
  
  // Для чисел < 100 оставляем как есть
  return priceStr;
};

  // Загружаем данные кейса по ID
  useEffect(() => {
    const loadCaseData = async () => {
      try {
        setIsLoading(true);
        console.log(`📦 Загрузка данных кейса ID: ${caseItem.id}`);
        
        // В демо-режиме пропускаем загрузку с API
        if (isDemoMode) {
          console.log('🎮 Демо-режим: пропускаем загрузку с API');
          setCaseData({ 
            id: caseItem.id,
            name: caseItem.name,
            ...DEMO_CASE_PRICES[caseItem.id]
          });
          setCaseItems([]);
          setIsLoading(false);
          return;
        }
        
        const response = await casesApi.getCaseById(caseItem.id);
        console.log('✅ Данные кейса загружены:', response);
        
        setCaseData(response.case);
        setCaseItems(response.items || []);
      } catch (error) {
        console.error('❌ Ошибка загрузки данных кейса:', error);
        setCaseData({ 
          id: caseItem.id,
          name: caseItem.name,
          ...DEMO_CASE_PRICES[caseItem.id]
        });
        setCaseItems([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (caseItem?.id) {
      loadCaseData();
    }
  }, [caseItem, isDemoMode]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleTonClick = async () => {
    console.log(`Case ${caseItem.id} TON clicked!`);
    const price = getCasePrice();
    
    if (isDemoMode) {
      console.log('🎮 Демо-режим: открытие кейса за TON');
      
      // Проверяем баланс в демо-режиме
      if (demoBalance < price.ton) {
        alert(`Not enough TON in demo balance! You need ${price.ton} TON`);
        return;
      }
      
      // Списываем с демо-баланса
      removeFromDemoBalance(price.ton);
      
      // Переходим на спин без вызова API
      onNavigate('spin', { 
        caseId: caseItem.id, 
        isDemo: true,
        demoPrice: price.ton // передаем цену для отображения
      });
      onClose();
      return;
    }
    
    // Реальный режим - проверка баланса и открытие через API
    if (!caseData) {
      alert('Case data not loaded. Please try again.');
      return;
    }
    
    const requiredAmount = price.ton;
    
    try {
      await loadBalances();
      
      if (checkBalance('ton', requiredAmount)) {
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

  const handleStarClick = async () => {
    console.log(`Case ${caseItem.id} STARS clicked!`);
    const price = getCasePrice();
    
    if (isDemoMode) {
      console.log('🎮 Демо-режим: открытие кейса за звезды');
      
      // В демо-режиме звезды не списываем, просто открываем
      onNavigate('spin', { 
        caseId: caseItem.id, 
        isDemo: true,
        demoPrice: price.ton // передаем цену для отображения
      });
      onClose();
      return;
    }

    if (isProcessing) return;

    try {
      setIsProcessing(true);
      
      if (!caseData) {
        alert('Case data not loaded. Please try again.');
        return;
      }
      
      const starsCount = price.stars;
      console.log(`Opening case for ${starsCount} stars...`);
      
      if (checkBalance('stars', starsCount)) {
        await handleOpenCase('stars');
      } else {
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
      console.log(`🔄 Opening case ${caseItem.id} with currency: "${currency}"`);
      
      const result = await casesApi.openCase(caseItem.id, currency);
      console.log('✅ Case opened result:', result);
      
      const apiItem = result.item;
      console.log('🔍 API item from open:', apiItem);
      
      let fullItemData = null;
      if (caseItems.length > 0 && apiItem.index) {
        fullItemData = caseItems.find(item => 
          item.item_index === apiItem.index || 
          item.index === apiItem.index
        );
        console.log('🔍 Found full item data:', fullItemData);
      }
      
      let img = cardton1;
      let price = '0 TON';
      let name = apiItem.name || 'Reward';
      
      if (fullItemData) {
        if (fullItemData.image_url) {
          img = getImageUrl(fullItemData.image_url);
        }
        
        if (fullItemData.price_ton !== undefined) {
          price = `${fullItemData.price_ton} TON`;
        }
        
        if (fullItemData.name) {
          name = fullItemData.name;
        }
      } else {
        if (apiItem.image_url) {
          img = getImageUrl(apiItem.image_url);
        }
        
        if (apiItem.item_type === 'reward_ton' && apiItem.name) {
          const match = apiItem.name.match(/(\d+(\.\d+)?)\s*TON/);
          if (match) {
            price = `${match[1]} TON`;
          } else {
            price = apiItem.name;
          }
        }
      }
      
      const winData = {
        winningItem: {
          img: img,
          price: price,
          name: name,
          item_type: apiItem.item_type,
          index: apiItem.index,
          rarity: apiItem.rarity,
          image_url: fullItemData?.image_url || apiItem.image_url,
          price_ton: fullItemData?.price_ton,
          id: fullItemData?.id,
          fromApi: true,
          fullDataFound: !!fullItemData
        },
        apiResponse: result,
        fullItemData: fullItemData,
        caseId: caseItem.id
      };
      
      console.log('🎯 Formatted winData for SpinScreen:', winData);
      
      onClose();
      onNavigate('spin', { winData, caseId: caseItem.id });
      
    } catch (error) {
      console.error('❌ Error opening case:', error);
      console.error('💾 Error details:', error.response?.data);
      alert('Error opening case. Please try again.');
      setIsProcessing(false);
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return cardton1;
    
    if (imagePath.startsWith('/static/')) {
      return `https://shamefully-gifted-catbird.cloudpub.ru${imagePath}`;
    }
    
    if (imagePath.trim() === '') {
      return cardton1;
    }
    
    return imagePath;
  };

  const getFrameContents = () => {
    if (caseItems.length > 0) {
      return caseItems.map((item) => {
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
          index: item.index || item.item_index,
          name: item.name,
          originalItem: item
        };
      });
    }
    
    return Array(9).fill().map((_, index) => ({
      img: cardton1,
      price: '0 TON',
      itemType: 'reward_ton',
      id: index,
      index: `default_${index}`,
      name: 'Default Item'
    }));
  };

  const frameContents = getFrameContents();
  const price = getCasePrice();

  const getPriceClass = (priceStr) => {
    const priceValue = parseFloat(priceStr.replace(/[^\d.-]/g, ''));
    if (priceValue >= 501) return 'modal-item-price-gradient-3';
    if (priceValue >= 51) return 'modal-item-price-gradient-2';
    if (priceValue >= 11) return 'modal-item-price-gradient-1';
    return 'modal-item-price';
  };

  const getTonButtonClass = () => {
    const caseId = caseItem.id;
    
    if (caseId === 1) return 'modal-ton-button-case1';
    if (caseId === 2) return 'modal-ton-button-case2';
    if (caseId === 3) return 'modal-ton-button-case3';
    if (caseId === 4) return 'modal-ton-button-case4';
    if (caseId === 5) return 'modal-ton-button-case5';
    if (caseId === 6) return 'modal-ton-button-case6';
    return 'modal-ton-button-case1';
  };

  const getStarsButtonClass = () => {
    const caseId = caseItem.id;
    
    if (caseId === 1) return 'modal-stars-button-case1';
    if (caseId === 2) return 'modal-stars-button-case2';
    if (caseId === 3) return 'modal-stars-button-case3';
    if (caseId === 4) return 'modal-stars-button-case4';
    if (caseId === 5) return 'modal-stars-button-case5';
    if (caseId === 6) return 'modal-stars-button-case6';
    return 'modal-stars-button-case1';
  };

  const titleClass = getTitleClass();
  const labelClass = getLabelClass();
  const tonButtonClass = getTonButtonClass();
  const starsButtonClass = getStarsButtonClass();
  const frameBackground = getFrameBackground();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container">
        <div className="case-modal" onClick={(e) => e.stopPropagation()} data-case-id={caseItem.id}>
          <button className="modal-close" onClick={onClose}>×</button>
          
          <h2 className={titleClass}>{caseData?.name || caseItem.name}</h2>
          
          <div className="modal-items-section">
            <div className={labelClass}>WHAT'S INSIDE?</div>
            
            {isLoading ? (
              <div className="modal-loading-items">
                <div className="modal-spinner"></div>
                <p>Loading items...</p>
              </div>
            ) : (
              <div className="modal-items-grid">
                {frameContents.map((content, index) => (
                  <div 
                    key={index} 
                    className="modal-item-frame"
                    style={{
                      backgroundImage: `url(${frameBackground})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    <div className="modal-item-content">
                      <img 
                        src={content.img} 
                        alt={`Item ${index + 1}`} 
                        className="modal-item-image"
                        loading="lazy"
                        onError={(e) => {
                          console.error(`Failed to load image: ${content.imageUrl}`);
                          e.target.src = cardton1;
                        }}
                      />
                      <div className={getPriceClass(content.price)}>
                        {formatPrice(content.price)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <div className="modal-button-container">
              {caseItem.id === 1 ? (
                // Для первого кейса одна кнопка FREE/LOCKED
                <div 
                  className={`modal-button modal-free-button ${isDemoMode ? 'modal-button-disabled' : ''}`}
                  onClick={isDemoMode ? null : handleTonClick}
                >
                  <span className="modal-button-text">
                    {isProcessing ? (
                      <span className="modal-processing-text">Wait...</span>
                    ) : (
                      <span className="modal-free-value">
                        {isDemoMode ? 'LOCKED' : 'FREE'}
                      </span>
                    )}
                  </span>
                </div>
              ) : (
                // Для остальных кейсов две кнопки
                <>
                  <div 
                    className={`modal-button modal-ton-button ${tonButtonClass} ${isProcessing ? 'modal-button-disabled' : ''}`}
                    onClick={handleTonClick}
                  >
                    <span className="modal-button-text">
                      {isProcessing ? (
                        <span className="modal-processing-text">Wait...</span>
                      ) : (
                        <>
                          <img src={tonIcon} alt="TON" className="modal-ton-icon" />
                          <span className="modal-button-number">
                            {price.ton}
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                  
                  <div 
                    className={`modal-button modal-stars-button ${starsButtonClass} ${isProcessing ? 'modal-button-disabled' : ''}`}
                    onClick={handleStarClick}
                  >
                    <span className="modal-button-text">
                      {isProcessing ? (
                        <span className="modal-processing-text">Wait...</span>
                      ) : (
                        <>
                          <img src={starsIcon} alt="STARS" className="modal-stars-icon" />
                          <span className="modal-button-number">
                            {price.stars}
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}