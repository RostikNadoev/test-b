import { useState, useEffect } from 'react';
import '../styles/CaseModal.css';
import { casesApi } from '../utils/api';
import { useDemo } from '../contexts/DemoContext';
import { useBalance } from '../contexts/BalanceContext';

// Импортируем иконки
import tonIcon from '../assets/MainPage/cases/tonicon.png';
import starsIcon from '../assets/MainPage/cases/starsicon.png';
import star from '../assets/MainPage/star1.png';
import cardton1 from '../assets/MainPage/chest1/ton.png';

export default function CaseModal({ caseItem, onClose, onNavigate }) {
  const [caseData, setCaseData] = useState(null);
  const [caseItems, setCaseItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { isDemoMode } = useDemo();
  const { balances, checkBalance, loadBalances } = useBalance();

  // Загружаем данные кейса по ID
  useEffect(() => {
    const loadCaseData = async () => {
      try {
        setIsLoading(true);
        const response = await casesApi.getCaseById(caseItem.id);
        setCaseData(response.case);
        setCaseItems(response.items || []);
        console.log(`✅ Case ${caseItem.id} data loaded:`, response.case);
      } catch (error) {
        console.error('❌ Error loading case data:', error);
        // Используем данные из props как fallback
        setCaseData({ 
          price_ton: parseFloat(caseItem.tonPrice) || 2, 
          price_stars: parseFloat(caseItem.starsPrice) || 200 
        });
        setCaseItems([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (caseItem?.id) {
      loadCaseData();
    }
  }, [caseItem]);

  useEffect(() => {
    // Блокируем скролл body при открытии модалки
    document.body.style.overflow = 'hidden';
    
    return () => {
      // Возвращаем скролл при закрытии
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleTonClick = async () => {
    console.log(`Case ${caseItem.id} TON clicked! Checking balance...`);
    
    if (isDemoMode) {
      console.log('Demo mode: opening spin page...');
      onNavigate('spin1', { isDemo: true });
      onClose();
      return;
    }
    
    if (!caseData) {
      alert('Case data not loaded. Please try again.');
      return;
    }
    
    const requiredAmount = caseData.price_ton || parseFloat(caseItem.tonPrice) || 2;
    
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
    if (isDemoMode) {
      console.log('Demo mode: opening spin page...');
      onNavigate('spin1', { isDemo: true });
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
      
      const starsCount = caseData.price_stars || parseFloat(caseItem.starsPrice) || 200;
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
      console.log('📦 Available case items:', caseItems);
      
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
        fullItemData: fullItemData
      };
      
      console.log('🎯 Formatted winData for Spin1Screen:', winData);
      
      onClose();
      onNavigate('spin1', { winData });
      
    } catch (error) {
      console.error('❌ Error opening case:', error);
      console.error('💾 Error details:', error.response?.data);
      alert('Error opening case. Please try again.');
      setIsProcessing(false);
    }
  };

  // Функция для получения URL изображения из API
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
    
    // Заглушка на время загрузки
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

  const getPriceClass = (priceStr) => {
    const priceValue = parseFloat(priceStr.replace(/[^\d.-]/g, ''));
    if (priceValue >= 501) return 'modal-item-price-gradient-3';
    if (priceValue >= 51) return 'modal-item-price-gradient-2';
    if (priceValue >= 11) return 'modal-item-price-gradient-1';
    return 'modal-item-price';
  };

  // Определяем градиенты для кнопок в зависимости от ID кейса
  const getTonButtonClass = () => {
    const caseId = caseItem.id;
    
    if (caseId === 1) return 'modal-ton-button-case1';
    if (caseId === 2) return 'modal-ton-button-case2';
    if (caseId === 3) return 'modal-ton-button-case3';
    if (caseId === 4) return 'modal-ton-button-case4';
    if (caseId === 5) return 'modal-ton-button-case5';
    if (caseId === 6) return 'modal-ton-button-case6';
    return 'modal-ton-button-case1'; // По умолчанию
  };

  const getStarsButtonClass = () => {
    const caseId = caseItem.id;
    
    if (caseId === 1) return 'modal-stars-button-case1';
    if (caseId === 2) return 'modal-stars-button-case2';
    if (caseId === 3) return 'modal-stars-button-case3';
    if (caseId === 4) return 'modal-stars-button-case4';
    if (caseId === 5) return 'modal-stars-button-case5';
    if (caseId === 6) return 'modal-stars-button-case6';
    return 'modal-stars-button-case1'; // По умолчанию
  };

  const tonButtonClass = getTonButtonClass();
  const starsButtonClass = getStarsButtonClass();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container">
        <div className="case-modal" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose}>×</button>
          
          <h2 className="modal-title">{caseItem.title}</h2>
          
          <div className="modal-items-section">
            <div className="modal-items-label">WHAT'S INSIDE?</div>
            
            {isLoading ? (
              <div className="modal-loading-items">
                <div className="modal-spinner"></div>
                <p>Loading items...</p>
              </div>
            ) : (
              <div className="modal-items-grid">
                {frameContents.map((content, index) => (
                  <div key={index} className="modal-item-frame">
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
                      <div className={getPriceClass(content.price)}>{content.price}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <div className="modal-button-container">
              {/* Кнопка TON */}
              <div 
                className={`modal-button modal-ton-button ${tonButtonClass} ${isProcessing ? 'modal-button-disabled' : ''}`}
                onClick={handleTonClick}
              >
                <span className="modal-button-text">
                  {isProcessing ? (
                    <span className="modal-processing-text">Processing...</span>
                  ) : (
                    <>
                      <img src={tonIcon} alt="TON" className="modal-ton-icon" />
                      <span className="modal-button-number">
                        {caseData?.price_ton || caseItem.tonPrice || '2'}
                      </span>
                    </>
                  )}
                </span>
              </div>
              
              {/* Кнопка STARS */}
              <div 
                className={`modal-button modal-stars-button ${starsButtonClass} ${isProcessing ? 'modal-button-disabled' : ''}`}
                onClick={handleStarClick}
              >
                <span className="modal-button-text">
                  {isProcessing ? (
                    <span className="modal-processing-text">Processing...</span>
                  ) : (
                    <>
                      <img src={starsIcon} alt="STARS" className="modal-stars-icon" />
                      <span className="modal-button-number">
                        {caseData?.price_stars || caseItem.starsPrice || '200'}
                      </span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}