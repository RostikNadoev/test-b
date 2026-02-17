import { useState, useEffect } from 'react';
import '../styles/CaseModal.css';
import { casesApi } from '../utils/api';
import { useDemo } from '../contexts/DemoContext';
import { useBalance } from '../contexts/BalanceContext';

// Импортируем иконки
import tonIcon from '../assets/MainPage/cases/tonicon.png';
import starsIcon from '../assets/MainPage/cases/starsicon.png';
import cardtonDefault from '../assets/MainPage/chest1/ton.png';

export default function CaseModal({ caseItem, onClose, onNavigate }) {
  const [caseItems, setCaseItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  const { isDemoMode } = useDemo();
  const { balances, checkBalance, loadBalances } = useBalance();

  // Базовый URL для изображений
  const BASE_URL = 'https://shamefully-gifted-catbird.cloudpub.ru';

  // Загружаем содержимое кейса
  useEffect(() => {
    const loadCaseContents = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Пытаемся получить содержимое кейса
        // Если нет отдельного эндпоинта, используем заглушку
        console.log(`📦 Загрузка содержимого кейса ${caseItem.id}...`);
        
        // Здесь должен быть запрос к API для получения предметов кейса
        // Пока используем демо-данные на основе цены
        
        // Генерируем предметы на основе цены кейса
        const mockItems = [];
        const tonPrice = caseItem.price?.ton || 2;
        
        // Создаем несколько предметов для отображения
        for (let i = 0; i < 9; i++) {
          const isTonReward = Math.random() > 0.3;
          const priceTon = (Math.random() * tonPrice * 2).toFixed(2);
          
          mockItems.push({
            id: i + 1,
            case_item_id: i + 1,
            item_type: isTonReward ? 'reward_ton' : 'tg_gift',
            name: isTonReward ? `${priceTon} TON` : `Gift ${i + 1}`,
            title: isTonReward ? 'TON reward' : `Gift ${i + 1}`,
            description: 'Item description',
            image_url: isTonReward ? null : null,
            price_ton: parseFloat(priceTon),
            price_stars: 0,
            rarity: 'common',
            item_index: i + 1,
            index: i + 1,
            meta: {
              telegram_gift_id: isTonReward ? '' : `gift_${i + 1}`,
              nft: false
            }
          });
        }
        
        setCaseItems(mockItems);
      } catch (error) {
        console.error('❌ Ошибка загрузки содержимого кейса:', error);
        setError('Failed to load case contents');
        setCaseItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (caseItem?.id) {
      loadCaseContents();
    }
  }, [caseItem]);

  // Блокируем скролл при открытии
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Получить URL изображения
  const getImageUrl = (item) => {
    if (!item) return cardtonDefault;
    
    // Если есть изображение
    if (item.image_url) {
      if (item.image_url.startsWith('/static/')) {
        return `${BASE_URL}${item.image_url}`;
      }
      return item.image_url;
    }
    
    // Для TON наград используем дефолтную иконку
    if (item.item_type === 'reward_ton') {
      return cardtonDefault;
    }
    
    return cardtonDefault;
  };

  // Получить цену для отображения
  const getItemPrice = (item) => {
    if (!item) return '0 TON';
    
    if (item.item_type === 'reward_ton') {
      return `${item.price_ton?.toFixed(2) || '0'} TON`;
    } else if (item.item_type === 'tg_gift') {
      return `${item.price_ton?.toFixed(2) || '0'} TON`;
    }
    
    return '0 TON';
  };

  // Обработчик открытия за TON
  const handleTonClick = async () => {
    console.log(`💰 Открытие кейса ${caseItem.id} за TON...`);
    
    if (isDemoMode) {
      console.log('🎮 Демо режим: переход на спин');
      onNavigate('spin', { 
        caseId: caseItem.id,
        isDemo: true 
      });
      onClose();
      return;
    }
    
    if (isProcessing) return;
    
    const requiredAmount = caseItem.price?.ton || 2;
    
    try {
      await loadBalances();
      
      if (checkBalance('ton', requiredAmount)) {
        await handleOpenCase('ton');
      } else {
        alert(`Insufficient TON balance. Need ${requiredAmount} TON`);
      }
    } catch (error) {
      console.error('❌ Balance check error:', error);
      alert('Error checking balance');
    }
  };

  // Обработчик открытия за Stars
  const handleStarClick = async () => {
    console.log(`⭐ Открытие кейса ${caseItem.id} за Stars...`);
    
    if (isDemoMode) {
      onNavigate('spin', { 
        caseId: caseItem.id,
        isDemo: true 
      });
      onClose();
      return;
    }

    if (isProcessing) return;

    const requiredAmount = caseItem.price?.stars || 0;
    
    if (requiredAmount <= 0) {
      alert('This case cannot be opened with Stars');
      return;
    }

    try {
      await loadBalances();
      
      if (checkBalance('stars', requiredAmount)) {
        await handleOpenCase('stars');
      } else {
        alert(`Insufficient Stars balance. Need ${requiredAmount} Stars`);
      }
    } catch (error) {
      console.error('❌ Balance check error:', error);
      alert('Error checking balance');
    }
  };

  // Открытие кейса через API
  const handleOpenCase = async (currency) => {
    try {
      setIsProcessing(true);
      console.log(`🎰 Открываем кейс ${caseItem.id} через API...`);
      
      const result = await casesApi.openCase(caseItem.id, currency);
      console.log('✅ Кейс открыт, результат:', result);
      
      // Формируем данные для экрана спина
      const winData = {
        caseId: caseItem.id,
        caseName: caseItem.name,
        payment: result.payment,
        drop: result.drop,
        result: result.result,
        netChange: result.net_change,
        balanceAfter: result.balance_after,
        
        // Для совместимости со старым кодом
        winningItem: {
          img: getImageUrl(result.drop),
          price: result.result?.reward 
            ? `${result.result.reward.amount} ${result.result.reward.currency.toUpperCase()}`
            : result.drop?.title || 'Item',
          name: result.drop?.title || 'Reward',
          item_type: result.drop?.type,
          index: result.drop?.case_item_id,
          rarity: 'common',
          image_url: result.drop?.image_url,
          price_ton: result.result?.reward?.amount,
          id: result.drop?.case_item_id
        },
        apiResponse: result
      };
      
      console.log('🎯 Данные для спина:', winData);
      
      onClose();
      onNavigate('spin', { winData });
      
    } catch (error) {
      console.error('❌ Ошибка открытия кейса:', error);
      alert(`Failed to open case: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Класс для цены (по редкости)
  const getPriceClass = (priceStr) => {
    if (!priceStr) return 'modal-item-price';
    
    const priceValue = parseFloat(priceStr.replace(/[^\d.-]/g, ''));
    if (priceValue >= 501) return 'modal-item-price-gradient-3';
    if (priceValue >= 51) return 'modal-item-price-gradient-2';
    if (priceValue >= 11) return 'modal-item-price-gradient-1';
    return 'modal-item-price';
  };

  // Классы для кнопок
  const getTonButtonClass = () => {
    const gradients = ['', '-case1', '-case2', '-case3', '-case4', '-case5', '-case6'];
    return `modal-ton-button${gradients[caseItem.id] || ''}`;
  };

  const getStarsButtonClass = () => {
    const gradients = ['', '-case1', '-case2', '-case3', '-case4', '-case5', '-case6'];
    return `modal-stars-button${gradients[caseItem.id] || ''}`;
  };

  const tonButtonClass = getTonButtonClass();
  const starsButtonClass = getStarsButtonClass();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container">
        <div className="case-modal" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose}>×</button>
          
          <h2 className="modal-title">{caseItem.name}</h2>
          
          <div className="modal-items-section">
            <div className="modal-items-label">WHAT'S INSIDE?</div>
            
            {isLoading ? (
              <div className="modal-loading-items">
                <div className="modal-spinner"></div>
                <p>Loading items...</p>
              </div>
            ) : error ? (
              <div className="modal-error">
                <p>{error}</p>
              </div>
            ) : (
              <div className="modal-items-grid">
                {caseItems.map((item) => {
                  const price = getItemPrice(item);
                  return (
                    <div key={item.id} className="modal-item-frame">
                      <div className="modal-item-content">
                        <img 
                          src={getImageUrl(item)} 
                          alt={item.name || 'Item'} 
                          className="modal-item-image"
                          loading="lazy"
                          onError={(e) => {
                            e.target.src = cardtonDefault;
                          }}
                        />
                        <div className={getPriceClass(price)}>{price}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <div className="modal-button-container">
              {/* Кнопка TON */}
              <div 
                className={`modal-button modal-ton-button ${tonButtonClass} ${isProcessing ? 'modal-button-disabled' : ''}`}
                onClick={!isProcessing ? handleTonClick : null}
              >
                <span className="modal-button-text">
                  {isProcessing ? (
                    <span className="modal-processing-text">Processing...</span>
                  ) : (
                    <>
                      <img src={tonIcon} alt="TON" className="modal-ton-icon" />
                      <span className="modal-button-number">
                        {caseItem.price?.ton?.toFixed(2) || '2'}
                      </span>
                    </>
                  )}
                </span>
              </div>
              
              {/* Кнопка STARS (только если цена > 0) */}
              {(caseItem.price?.stars || 0) > 0 && (
                <div 
                  className={`modal-button modal-stars-button ${starsButtonClass} ${isProcessing ? 'modal-button-disabled' : ''}`}
                  onClick={!isProcessing ? handleStarClick : null}
                >
                  <span className="modal-button-text">
                    {isProcessing ? (
                      <span className="modal-processing-text">Processing...</span>
                    ) : (
                      <>
                        <img src={starsIcon} alt="STARS" className="modal-stars-icon" />
                        <span className="modal-button-number">
                          {caseItem.price?.stars || '0'}
                        </span>
                      </>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}