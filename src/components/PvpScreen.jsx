import React, { useState, useRef, useEffect, useMemo } from 'react';
import MainLayout from './MainLayout';
import '../styles/PvpScreen.css';
import arrow from '../assets/SpinPage/arrow.png';
import emptyPat from '../assets/PVP/empty-pat.png';
import pvpBackground from '../assets/PVP/main.png';
import { useDemo } from '../contexts/DemoContext';
import gift from '../assets/Profile/gift.png';
import modalCloseIcon from '../assets/Profile/close.png';
import { authApi, usersApi } from '../utils/api';
import cardton1 from '../assets/MainPage/chest1/ton.png';
import tasksicon from '../assets/MainPage/tasks-icon.svg';
import giftsIcon from '../assets/PVP/gifts.png';
import tonIcon from '../assets/MainPage/ton.svg';
import tonIcon1 from '../assets/MainPage/ton1.svg';
import tonIcon2 from '../assets/MainPage/ton2.svg';  
import tonIcon3 from '../assets/MainPage/ton3.svg';  
import { usePvp } from '../hooks/usePvp';

export default function PvpScreen({ onNavigate }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isGiftModalClosing, setIsGiftModalClosing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdownValue, setCountdownValue] = useState(20);
  const [imagesLoaded, setImagesLoaded] = useState({});
  
  // Новые состояния для анимации
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [fixedFrames, setFixedFrames] = useState([]); // Зафиксированная лента для спина

  const scrollerRef = useRef(null);
  const animationRef = useRef(null);
  const scrollIntervalRef = useRef(null); // Для медленной прокрутки в ожидании
  const { isDemoMode, demoInventory } = useDemo();

  const {
    gameState,
    preSpinWinner,
    isSpinning,
    isLocked,
    currentUserInGame,
    winModal,
    joinGame,
    leaveGame,
    requestState,
    getGameStatus,
    calculateFramePositions,
    getUserGifts,
    totalValue,
    gameId,
    players,
    isConnected,
    startSpin,
    getRemainingTime
  } = usePvp();

  const gameStatus = getGameStatus();
  // Обычные позиции (для режима ожидания)
  const framePositions = useMemo(() => calculateFramePositions(), [calculateFramePositions]);

 // --- ЛОГИКА ТАЙМЕРА ---
useEffect(() => {
  if (gameStatus.type !== 'countdown') {
    if (gameStatus.type === 'waiting') setCountdownValue(20);
    return;
  }

  let lastUpdateTime = Date.now();
  let displayedValue = 20;

  const updateTimer = () => {
    const remaining = getRemainingTime();
    if (remaining === null || remaining <= 0) {
      setCountdownValue(0);
      return;
    }
    
    const now = Date.now();
    const timePassed = now - lastUpdateTime;
    
    // Если с прошлого обновления прошло больше 500мс, обновляем
    if (timePassed >= 500) {
      const rawSeconds = remaining / 1000;
      
      // Для первых секунд: если 20.0-20.5 сек, показываем 20
      // если 19.5-20.0 сек, показываем 19 (чтобы быстрее ушло)
      if (rawSeconds > 19.5) {
        displayedValue = 20;
      } else if (rawSeconds > 18.5) {
        displayedValue = 19;
      } else {
        displayedValue = Math.floor(rawSeconds);
      }
      
      setCountdownValue(displayedValue);
      lastUpdateTime = now;
    }
  };

  // Запускаем более часто - каждые 100мс
  const timer = setInterval(updateTimer, 100);
  return () => clearInterval(timer);
}, [gameStatus.type, getRemainingTime]);



  // --- АВТОЗАПУСК СПИНА ---
  // Если таймер вышел (0) и есть победитель -> запускаем спин
  useEffect(() => {
    if (countdownValue === 0 && preSpinWinner && !isSpinning && gameStatus.type !== 'spinning') {
      console.log('🎡 Таймер 0, данные победителя есть. Старт через 500мс');
      const spinTimer = setTimeout(() => {
        startSpin(); // Это переключит isSpinning в true
      }, 500);
      return () => clearTimeout(spinTimer);
    }
  }, [countdownValue, preSpinWinner, isSpinning, startSpin, gameStatus.type]);

  // --- МЕДЛЕННАЯ ПРОКРУТКА В ОЖИДАНИИ (ЧУТЬ БЫСТРЕЕ) ---
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    // Очищаем предыдущий интервал
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }

    // Запускаем медленную прокрутку только в режиме ожидания или таймера
    if (gameStatus.type === 'waiting' || gameStatus.type === 'countdown') {
      let scrollPosition = 0;
      const scrollStep = 1; // ЧУТЬ БЫСТРЕЕ (было 0.5)
      
      scrollIntervalRef.current = setInterval(() => {
        if (scroller) {
          scrollPosition += scrollStep;
          scroller.scrollLeft = scrollPosition;
          
          // Если дошли до конца, возвращаемся в начало
          if (scrollPosition >= scroller.scrollWidth - scroller.clientWidth) {
            scrollPosition = 0;
          }
        }
      }, 40); // ЧУТЬ ЧАЩЕ (было 50мс)
    }

    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    };
  }, [gameStatus.type]);

  // --- ПОДГОТОВКА ЛЕНТЫ (CS:GO STYLE) ---
  useEffect(() => {
    // Срабатываем, когда статус стал 'spinning' и у нас есть победитель
    if (gameStatus.type === 'spinning' && preSpinWinner && fixedFrames.length === 0) {
      console.log('🎰 Генерация фиксированной ленты рулетки...');

      // Очищаем интервал медленной прокрутки
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }

      // 1. Берем текущих игроков или создаем заглушки
      let sourceFrames = framePositions.length > 0 ? framePositions : Array(10).fill(null);
      
      // 2. Размножаем их, чтобы получить длинную ленту (минимум 100 слотов)
      let finalFrames = [...sourceFrames];
      while (finalFrames.length < 105) {
        finalFrames = [...finalFrames, ...sourceFrames];
      }
      // Обрезаем до ровного числа
      finalFrames = finalFrames.slice(0, 110);

      // 3. ЦЕЛЕВАЯ ПОЗИЦИЯ: Индекс 75. 
      // Именно сюда мы принудительно вставляем победителя.
      const TARGET_INDEX = 75;

      const winnerFrame = {
        playerId: preSpinWinner.user_id,
        username: preSpinWinner.username,
        photoUrl: preSpinWinner.photo,
        sumValue: preSpinWinner.sum_value || 0
      };

      // Вставляем победителя
      finalFrames[TARGET_INDEX] = winnerFrame;

      setFixedFrames(finalFrames);
      setShouldAnimate(true);

      // Снимаем блюр
      const scroller = document.querySelector('.pvp-frames-scroller');
      const arrow = document.querySelector('.pvp-arrow-container');
      if (scroller) scroller.classList.remove('blurred');
      if (arrow) arrow.classList.remove('blurred');
    }
  }, [gameStatus.type, preSpinWinner, framePositions, fixedFrames.length]);

  // --- АНИМАЦИЯ ПРОКРУТКИ ---
  useEffect(() => {
    if (!shouldAnimate || !scrollerRef.current || fixedFrames.length === 0) return;

    const scroller = scrollerRef.current;
    
    // Получаем ширину карточки
    const firstCard = scroller.querySelector('.pvp-item-frame');
    if (!firstCard) return;

    // Ширина карточки + gap (в CSS gap: 10px)
    const cardWidth = firstCard.offsetWidth;
    const gap = 10; 
    const itemFullWidth = cardWidth + gap;
    
    // Цель - 75-й элемент
    const TARGET_INDEX = 75;

    // Считаем центр: (Позиция элемента) - (Половина экрана) + (Половина элемента)
    const containerWidth = scroller.offsetWidth;
    const targetScrollPosition = (TARGET_INDEX * itemFullWidth) - (containerWidth / 2) + (cardWidth / 2);

    // Сбрасываем в начало
    scroller.scrollLeft = 0;

    const duration = 7000; // 7 секунд
    const startTime = performance.now();

    // Функция плавности (Ease Out Quart) - быстрое начало, очень медленный конец
    const easeOutQuart = (x) => 1 - Math.pow(1 - x, 4);

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const ease = easeOutQuart(progress);
      const currentPos = targetScrollPosition * ease;
      
      scroller.scrollLeft = currentPos;

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Финиш - жестко ставим позицию
        scroller.scrollLeft = targetScrollPosition;
        console.log('🏁 Спин завершен');
        
        // Немного ждем перед показом модалки
        setTimeout(() => {
            setShouldAnimate(false);
        }, 1000);
      }
    };

    // Задержка 100мс перед стартом
    setTimeout(() => {
        animationRef.current = requestAnimationFrame(animate);
    }, 100);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [shouldAnimate, fixedFrames]);

  // Сброс при выходе из спина
  useEffect(() => {
    if (gameStatus.type !== 'spinning') {
        setFixedFrames([]);
        setShouldAnimate(false);
    }
  }, [gameStatus.type]);

  // --- БЛОКИРОВКА КНОПКИ ПРИ 3 СЕКУНДАХ ТАЙМЕРА ---
  const isJoinButtonDisabled = useMemo(() => {
    if (gameStatus.type === 'countdown' && countdownValue <= 3 && countdownValue > 0) {
      return true;
    }
    if (gameStatus.type === 'spinning') {
      return true;
    }
    return false;
  }, [gameStatus.type, countdownValue]);

  // --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
  const loadInventory = async () => {
    if (isDemoMode) return;
    try {
      setLoading(true);
      const inventoryData = await usersApi.getInventory();
      let items = [];
      if (Array.isArray(inventoryData)) items = inventoryData;
      else if (inventoryData?.inventory) items = inventoryData.inventory;
      else if (inventoryData?.items) items = inventoryData.items;
      setInventory(items);
    } catch (error) {
      console.error('Error loading inventory:', error);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isModalOpen && !isDemoMode) loadInventory();
  }, [isModalOpen, isDemoMode]);

  const handleJoinClick = () => {
    if (currentUserInGame) handleLeaveGame();
    else {
      setIsModalOpen(true);
      setSelectedItems(new Set());
    }
  };

  const handleLeaveGame = () => {
    if (isLocked) return;
    setIsSubmitting(true);
    if (leaveGame()) setIsModalOpen(false);
    setIsSubmitting(false);
  };

  const handleConfirmJoin = async () => {
    if (selectedItems.size === 0 || isLocked) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const selectedItemsArray = getItemsToDisplay().filter(item => selectedItems.has(getItemId(item)));
    const inventoryIds = selectedItemsArray.map(item => item.inventory_id || item.id).filter(id => id);
    
    setIsSubmitting(true);
    try {
      if (joinGame(inventoryIds)) {
        setIsModalOpen(false);
        setSelectedItems(new Set());
        setTimeout(() => requestState(), 300);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setIsClosing(true);
    setSelectedItems(new Set());
  };

  // ИСПРАВЛЕННАЯ ФУНКЦИЯ ДЛЯ ПЛАВНОГО ЗАКРЫТИЯ МОДАЛКИ ПОДАРКОВ
  const handleCloseGiftModal = () => {
    setIsGiftModalClosing(true);
    // Ждем завершения анимации перед закрытием
    setTimeout(() => {
      setIsGiftModalOpen(false);
      setIsGiftModalClosing(false);
      setSelectedUser(null);
    }, 400); // 400ms = длительность анимации pvpModalSlideOut
  };

  const handleAnimationEnd = () => {
    if (isClosing) {
      setIsModalOpen(false);
      setIsClosing(false);
    }
  };

  const handleGoToProfile = () => {
    handleCloseModal();
    onNavigate('profile');
  };

  const handleGiftButtonClick = (player) => {
    setSelectedUser({ ...player });
    setIsGiftModalOpen(true);
  };

 const renderStatusText = () => {
  if (gameStatus.type === 'waiting') {
    return 'Waiting for players...'.split('').map((letter, index) => (
      <span 
        key={index} 
        className={`waiting-letter ${letter === ' ' ? 'space' : ''}`}
        style={{ animationDelay: `${index * 0.1}s` }}
      >
        {letter}
      </span>
    ));
  } else if (gameStatus.type === 'countdown') {
    return <span className="countdown-text">{countdownValue.toString().padStart(2, '0')}</span>;
  }
  return null;
};

  const getItemsToDisplay = () => isDemoMode ? demoInventory : inventory;
  const getItemId = (item) => isDemoMode ? (item.id || item.demo_id) : (item.inventory_id || item.id);
  
  const getImageUrl = (imagePath) => {
    if (!imagePath) return cardton1;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/static/')) return `${(import.meta.env.VITE_BACKEND_URL || 'https://shamefully-gifted-catbird.cloudpub.ru').replace(/\/$/, '')}${imagePath}`;
    return imagePath.startsWith('./') ? imagePath : cardton1;
  };

  const getItemImage = (item) => {
    if (isDemoMode) return item.img || cardton1;
    return getImageUrl(item.image_url || item.img || item.case_item?.image_url);
  };

  const getItemPrice = (item) => {
    if (isDemoMode) return item.price || '0 TON';
    const val = item.price_ton || item.item_value || 0;
    return `${val} TON`;
  };

  const getPriceClass = (priceStr) => {
    const price = parseFloat(priceStr.toString().replace(/[^\d.-]/g, ''));
    if (price >= 501) return 'item-price-gradient-3';
    if (price >= 51) return 'item-price-gradient-2';
    if (price >= 11) return 'item-price-gradient-1';
    return 'inventory-item-price';
  };


const getTonIconForPrice = (priceStr) => {
  const price = parseFloat(priceStr.toString().replace(/[^\d.-]/g, ''));
  
  if (price >= 501) return tonIcon3; 
  if (price >= 51) return tonIcon2;   
  if (price >= 11) return tonIcon1;  
  return tonIcon;  
};

  const handleItemClick = (item) => {
    const itemId = getItemId(item);
    const newSet = new Set(selectedItems);
    if (newSet.has(itemId)) newSet.delete(itemId);
    else newSet.add(itemId);
    setSelectedItems(newSet);
  };

  const formatInvestValue = (value) => {
  if (value === undefined || value === null) return '0.00';
  
  const numValue = parseFloat(value);
  
  if (numValue >= 1000) {
    return Math.round(numValue).toString();
  } else if (numValue >= 100) {
    return numValue.toFixed(1);
  } else {
    return numValue.toFixed(2);
  }
};

  const formatTotalValue = (val) => (!val && val !== 0) ? '0.00' : val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const handleImageError = (e) => { e.target.src = cardton1; e.target.onerror = null; };

  // Форматирование для модалки победителя
  const formatWinnerTotalValue = (val) => {
    if (!val && val !== 0) return '0.00';
    return parseFloat(val).toFixed(2);
  };

  // Выбираем, какой список рендерить
  const framesToRender = (gameStatus.type === 'spinning' && fixedFrames.length > 0) ? fixedFrames : framePositions;

  return (
    <MainLayout onNavigate={onNavigate} currentScreen="pvp" customBackground={pvpBackground}>
      <div className="pvp-screen-content">
        
        <div className="pvp-stats-container">
          <div className="pvp-stat-frame total-stat">
            <div className="stat-label">TOTAL:</div>
            <div className="stat-value">
              <span className="stat-amount">{formatTotalValue(totalValue)}</span>
              <img src={tonIcon} alt="TON" className="stat-ton-icon" />
            </div>
          </div>
          <div className="pvp-id-text">
            ID: <span className="pvp-id-number">{gameId || 0}</span>
          </div>
        </div>
        
        <div className="pvp-frames-container">
          {(gameStatus.type === 'waiting' || gameStatus.type === 'countdown') && (
            <div className="waiting-overlay">
              <div className="waiting-text">{renderStatusText()}</div>
            </div>
          )}

          <div className={`pvp-arrow-container ${(gameStatus.type === 'waiting' || gameStatus.type === 'countdown') ? 'blurred' : ''}`}>
            <img src={arrow} alt="Arrow" className="pvp-arrow" loading="lazy" />
          </div>

          <div
            className={`pvp-frames-scroller ${(gameStatus.type === 'waiting' || gameStatus.type === 'countdown') ? 'blurred' : ''}`}
            ref={scrollerRef}
          >
            {framesToRender.map((position, index) => (
              <div key={index} className="pvp-item-frame">
                <div className="pvp-item-content">
                  {position ? (
                    <div className="player-slot">
                      <div 
                        className="player-avatar"
                        style={{
                          backgroundImage: position.photoUrl ? `url(${position.photoUrl})` : 'linear-gradient(45deg, #3aabed, #82d5fe)',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}
                      />
                      <div className="player-nickname">
                        {position.username?.substring(0, 8) || 'Player'}
                      </div>
                    </div>
                  ) : (
                    <div className="empty-slot">
                      <div className="question-mark">?</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pvp-join-section">
          <button 
            className={`join-button ${(isLocked || isSubmitting || isJoinButtonDisabled) ? 'disabled' : ''}`}
            onClick={handleJoinClick}
            disabled={isLocked || isSubmitting || isJoinButtonDisabled}
          >
            {currentUserInGame ? 'LEAVE' : 'JOIN'}
            {isSubmitting && <span className="spinner-small"></span>}
          </button>
        </div>

        <div className="participants-table-section">
          <div className="participants-table">
            <div className="table-header">
              <div className="header-cell">USER</div>
              <div className="header-cell">INVESTS</div>
            </div>
            <div className="table-body">
              {players && players.length > 0 ? (
                <div className="participants-list">
                  {players.map((player) => (
                      <div key={player.user_id} className={`participant-row ${selectedUser?.user_id === player.user_id && isGiftModalOpen ? 'participant-row-active' : ''}`}>
                        <div className="participant-left-section">
                          <div 
                            className="participant-avatar"
                            style={{
                              backgroundImage: player.photo_url ? `url(${player.photo_url})` : undefined,
                              backgroundColor: player.photo_url ? 'transparent' : '#FF6B6B',
                              backgroundSize: 'cover',
                              backgroundPosition: 'center'
                            }}
                          />
                          <div className="participant-username" title={player.username}>
                            {player.username?.length > 7 ? player.username.substring(0, 6) + '...' : player.username}
                          </div>
                          <div className="participant-invests">
                            <span className="invests-amount">
                              {formatInvestValue(player.sum_value)}
                            </span>
                            <img src={tonIcon} alt="TON" className="ton-icon" />
                          </div>
                        </div>
                        <div className="participant-gift-button-container">
                          <button className="participant-gift-button" onClick={() => handleGiftButtonClick(player)}>
                            <img src={giftsIcon} alt="View gifts" className="gift-button-icon" />
                          </button>
                        </div>
                      </div>
                  ))}
                </div>
              ) : (
                <div className="empty-table-content">
                  <img src={emptyPat} alt="No participants" className="empty-pat-image" />
                  <div className="empty-table-message">No active participants</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="pvp-modal-overlay" onClick={handleCloseModal}>
          <div className="pvp-modal-blur-layer"></div>
          <div className={`pvp-modal-content ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()} onAnimationEnd={handleAnimationEnd}>
            <div className="pvp-modal-body">
              <h2 className="pvp-modal-title">SELECT GIFTS</h2>
              {loading ? (
                <div className="loading-inventory"><div className="spinner"></div><p>Loading inventory...</p></div>
              ) : getItemsToDisplay().length > 0 ? (
                <div className="pvp-inventory-container">
                  <div className="items-grid">
                    {getItemsToDisplay().map((item, index) => {
                      const isSelected = selectedItems.has(getItemId(item));
                      return (
                        <div key={index} className={`inventory-item-frame ${isSelected ? 'inventory-item-selected' : ''}`} onClick={() => handleItemClick(item)}>
                          <div className="inventory-item-content">
                            <img src={getItemImage(item)} alt="Item" className="inventory-item-image" loading="lazy" onError={(e) => handleImageError(e)} />
                            <div className={`inventory-item-price ${getPriceClass(getItemPrice(item))}`}>{getItemPrice(item)}</div>
                            {isSelected && <div className="inventory-item-selection-icon"><img src={tasksicon} alt="Selected" className="selection-icon" /></div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className='empty-gifts-container'>
                  <div className="empty-gifts-animation-wrapper"><img src={gift} className="empty-gifts-animation" alt="Empty" loading="lazy" /></div>
                  <div className="empty-gifts-text"><p className="no-gifts-text">No gifts yet.</p><p className="how-to-add-text" onClick={handleGoToProfile}>How to add?</p></div>
                </div>
              )}
            </div>
            <div className="pvp-modal-buttons">
              <button className="pvp-modal-cancel-btn" onClick={handleCloseModal} disabled={isSubmitting}>Cancel</button>
              <button className="pvp-modal-confirm-btn" onClick={handleConfirmJoin} disabled={selectedItems.size === 0 || isLocked || isSubmitting}>{isSubmitting ? 'Submitting...' : 'Confirm'}</button>
            </div>
            <button className="pvp-modal-close-btn" onClick={handleCloseModal}><img src={modalCloseIcon} alt="Close" className="pvp-modal-close-icon" /></button>
          </div>
        </div>
      )}

      {isGiftModalOpen && selectedUser && (
        <div className="pvp-gift-modal-overlay" onClick={handleCloseGiftModal}>
          <div className="pvp-gift-modal-blur-layer"></div>
          <div className={`pvp-gift-modal-content ${isGiftModalClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="pvp-gift-modal-header">
              <div className="pvp-gift-user-info">
                <div className="pvp-gift-user-avatar" style={{ backgroundImage: selectedUser.photo_url ? `url(${selectedUser.photo_url})` : undefined, backgroundColor: selectedUser.photo_url ? 'transparent' : '#35A3F2', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div className="pvp-gift-user-details">
                  <div className="pvp-gift-username">{selectedUser.username || 'Unknown'}</div>
                  <div className="pvp-gift-user-invests"><span className="pvp-gift-invests-amount">{selectedUser.sum_value?.toFixed(2) || '0.00'}</span><img src={tonIcon} alt="TON" className="pvp-gift-ton-icon" /></div>
                </div>
              </div>
            </div>
            <div className="pvp-gift-modal-body">
              <div className="pvp-gift-modal-title">Player's Gifts</div>
              <div className="pvp-gift-items-container">
                {getUserGifts(selectedUser.user_id).length > 0 ? (
                  <div className="gift-items-grid">
                    {getUserGifts(selectedUser.user_id).map((gift, index) => (
                        <div key={index} className="gift-item-frame">
                          <div className="gift-item-content">
                            <img src={getImageUrl(gift.case_item?.image_url || gift.image_url)} alt="Gift" className="gift-item-image" loading="lazy" onError={(e) => handleImageError(e)} />
                            <div className={`gift-item-price ${getPriceClass(gift.item_value)}`}>{gift.item_value} TON</div>
                          </div>
                        </div>
                    ))}
                  </div>
                ) : (
                  <div className="pvp-gift-empty-content"><div className="pvp-gift-empty-icon"><img src={gift} className="pvp-gift-empty-image" alt="No gifts" /></div><p className="pvp-gift-empty-text">Player hasn't placed any gifts yet</p></div>
                )}
              </div>
            </div>
            <div className="pvp-gift-modal-buttons"><button className="pvp-gift-modal-cancel-btn" onClick={handleCloseGiftModal}>Close</button></div>
            <button className="pvp-gift-modal-close-btn" onClick={handleCloseGiftModal}><img src={modalCloseIcon} alt="Close" className="pvp-gift-modal-close-icon" /></button>
          </div>
        </div>
      )}

      {winModal && (
        <div className="winner-modal-overlay" onClick={() => {}}>
          <div className="winner-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="winner-modal-header">
              <div className="winner-avatar">
                <div className="winner-avatar-image" style={{ backgroundImage: winModal.winner.photo ? `url(${winModal.winner.photo})` : undefined, backgroundColor: winModal.winner.photo ? 'transparent' : '#35A3F2', backgroundSize: 'cover', backgroundPosition: 'center' }} />
              </div>
              <div className="winner-info"><div className="winner-name">{winModal.winner.username}</div><div className="winner-game-id">Game ID: {winModal.game.id}</div></div>
            </div>
            <div className="winner-prize-section">
              <div className="winner-prize-title">Won Prizes</div>
              <div className="winner-prizes-container">
                {winModal.gifts?.map((gift, index) => ( 
                    <div key={index} className="winner-prize-item">
                      <img src={getImageUrl(gift.case_item?.image_url)} alt="Prize" className="winner-prize-image" onError={(e) => { e.target.src = cardton1; }} />
<div className={`winner-prize-value ${getPriceClass(gift.item_value)}`}>
  <span className="winner-price-amount">{gift.item_value}</span>
  <img 
    src={getTonIconForPrice(gift.item_value)} 
    alt="TON" 
    className="winner-price-ton-icon" 
  />
</div>
                    </div>
                ))}
              </div>
            </div>
            <div className="winner-total-section">
              <div className="winner-total-value">
                <span className="total-text">Total: </span>
                <span className="total-amount">{formatWinnerTotalValue(winModal.game.total_value)}</span>
                <img src={tonIcon} alt="TON" className="total-ton-icon" />
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}