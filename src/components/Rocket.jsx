import '../styles/Rocket.css';
import Header from './Header';
import Lottie from 'lottie-react';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import timerImg from '../assets/Rocket/timer.png';
import tonSvg from '../assets/MainPage/ton.svg';
import starSvg from '../assets/MainPage/star1.png';
import switchSvg from '../assets/MainPage/switch.svg';
import switchbSvg from '../assets/MainPage/switchd.svg';
import switchrSvg from '../assets/Rocket/switchr.svg';
import { Switch } from 'antd';
import { useCrashGame } from '../hooks/useCrashGame';
import { authApi } from '../utils/api';
import { useBalance } from '../contexts/BalanceContext';

export default function Rocket({ onNavigate, currentCardIndex = 2 }) {
  const [animationData, setAnimationData] = useState(null);
  const [exAnimationData, setExAnimationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBetModalOpen, setIsBetModalOpen] = useState(false);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const [cashoutPending, setCashoutPending] = useState(false);
  
  const [selectedCurrency, setSelectedCurrency] = useState('ton');
  const [betAmount, setBetAmount] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [autoPayoutEnabled, setAutoPayoutEnabled] = useState(false);
  const [payoutMultiplier, setPayoutMultiplier] = useState(1.2);
  const [userData, setUserData] = useState(null);
  const [lastMultipliersHistory, setLastMultipliersHistory] = useState([]);
  const [recentlyPlacedBet, setRecentlyPlacedBet] = useState(null);
  const [uiErrorMessage, setUiErrorMessage] = useState(null);
  const [lastStateRequest, setLastStateRequest] = useState(0);
  
  const currencyDropdownRef = useRef(null);
  const betInputRef = useRef(null);
  const historyUpdateIntervalRef = useRef(null);
  const explosionAnimationRef = useRef(null);
  const lastTempBetIdRef = useRef(null);
  const uiErrorTimeoutRef = useRef(null);
  const hasPlacedBetThisRoundRef = useRef(false);
  const inactivityTimerRef = useRef(null);
  
  const { balances, checkBalance, loadBalances, updateBalanceImmediately } = useBalance();

  const {
    multiplierNow,
    roundStatus,
    secondsToStart,
    secondsToBetsClose,
    bettingLocked,
    wsConnected,
    bets: participants,
    myBet,
    placeBet,
    cashoutBet,
    canBet,
    canCashout,
    stage,
    setStage, 
    lastMultipliers,
    crashMultiplier,
    getHistoryFromBackend,
    clearBetsOnCrash,
    currentRoundId,
    requestState,
    engineEvents
  } = useCrashGame();

  // Отладка stage изменений
  useEffect(() => {
    console.log('🎯 Stage changed to:', stage, 'roundStatus:', roundStatus);
  }, [stage, roundStatus]);

  // Сбрасываем локальный флаг при смене раунда
  useEffect(() => {
    if (currentRoundId) {
      hasPlacedBetThisRoundRef.current = false;
      console.log('🔄 Round changed to:', currentRoundId);
    }
  }, [currentRoundId]);

  // Мониторинг отсутствия событий (для запроса state)
  useEffect(() => {
    const resetInactivityTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      
      inactivityTimerRef.current = setTimeout(() => {
        if (wsConnected && stage !== 'explosion') {
          console.log('⚠️ No events for 5 seconds, requesting state...');
          requestState();
        }
      }, 5000);
    };

    const events = ['tick', 'timer', 'status', 'crash', 'bet_placed', 'bet_result'];
    events.forEach(event => {
      if (engineEvents[event]) {
        resetInactivityTimer();
      }
    });

    resetInactivityTimer();

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [engineEvents, wsConnected, stage, requestState]);

  // Запрос state при возвращении из фона
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && wsConnected) {
        console.log('👀 App returned from background, requesting state...');
        requestState();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [wsConnected, requestState]);

  const showUiError = (message, duration = 3000) => {
    setUiErrorMessage(message);
    if (uiErrorTimeoutRef.current) clearTimeout(uiErrorTimeoutRef.current);
    uiErrorTimeoutRef.current = setTimeout(() => {
      setUiErrorMessage(null);
    }, duration);
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const userDataResponse = await authApi.getMe();
        setUserData(userDataResponse.user);
        await loadBalances();
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };
    loadInitialData();
  }, [loadBalances]);

  // Обработка кэшаута
  useEffect(() => {
    if (engineEvents.cashout_ok) {
      console.log('💰 Cashout OK received');
      setCashoutPending(false);
      setRecentlyPlacedBet(null);
      setTimeout(() => {
        loadBalances();
        window.dispatchEvent(new CustomEvent('balanceUpdate'));
      }, 300);
    }
  }, [engineEvents.cashout_ok, loadBalances]);

  // Обработка ошибок
  useEffect(() => {
    if (engineEvents.error) {
      console.error('❌ Game error:', engineEvents.error);
      showUiError(engineEvents.error.error || 'Unknown error');
      setCashoutPending(false);
    }
  }, [engineEvents.error]);

  // Обработка результата ставки
  useEffect(() => {
    if (engineEvents.bet_result) {
      const betResult = engineEvents.bet_result;
      if ((myBet && betResult.bet_id === myBet.bet_id) || 
          (recentlyPlacedBet && betResult.bet_id === recentlyPlacedBet.bet_id)) {
        setCashoutPending(false);
        setRecentlyPlacedBet(null);
        lastTempBetIdRef.current = null;
        setTimeout(() => {
          loadBalances();
          window.dispatchEvent(new CustomEvent('balanceUpdate'));
        }, 300);
      }
    }
  }, [engineEvents.bet_result, myBet, recentlyPlacedBet, loadBalances]);

  // Обработка события КРАША
  useEffect(() => {
    if (engineEvents.crash) {
      console.log('💥 Crash detected in component');
      setRecentlyPlacedBet(null);
      lastTempBetIdRef.current = null;
      vibrateTriple();
    }
  }, [engineEvents.crash]);

  // Обработка bet_ok
  useEffect(() => {
    if (engineEvents.bet_ok && engineEvents.bet_ok.bet) {
      const bet = engineEvents.bet_ok.bet;
      setRecentlyPlacedBet(null);
      lastTempBetIdRef.current = null;
    }
  }, [engineEvents.bet_ok]);

  // Управление Lottie плеером для взрыва
  useEffect(() => {
    console.log('Explosion effect - stage:', stage, 'ref:', explosionAnimationRef.current);
    
    if (stage === 'explosion' && explosionAnimationRef.current) {
      console.log('💥 Playing explosion animation now');
      setTimeout(() => {
        if (explosionAnimationRef.current) {
          explosionAnimationRef.current.setSpeed(1.2);
          explosionAnimationRef.current.goToAndPlay(0, true);
        }
      }, 50);
    }
  }, [stage]);

  const handleExplosionComplete = () => {
    console.log('💥 Explosion animation completed');
    
    setTimeout(() => {
      console.log('⏱️ Switching to Timer');
      setStage('timer');
      
      setTimeout(() => {
        requestState();
      }, 100);
    }, 300);
  };

  // Вибрация
  useEffect(() => {
    if (engineEvents.tick && stage === 'rocket' && engineEvents.tick.multiplier > 1.0) {
      vibrate(30);
    }
  }, [engineEvents.tick, stage]);

  // История
  useEffect(() => {
    const loadHistory = async () => {
      const history = await getHistoryFromBackend();
      if (history && Array.isArray(history)) {
        const multipliers = history.map(item => item.crash_multiplier || 1.0);
        setLastMultipliersHistory(multipliers);
      }
    };
    loadHistory();
    historyUpdateIntervalRef.current = setInterval(loadHistory, 5000);
    return () => { 
      if (historyUpdateIntervalRef.current) {
        clearInterval(historyUpdateIntervalRef.current);
      }
    };
  }, [getHistoryFromBackend]);

  useEffect(() => {
    if (engineEvents.crash && crashMultiplier) {
      setLastMultipliersHistory(prev => [crashMultiplier, ...prev].slice(0, 10));
    }
  }, [engineEvents.crash, crashMultiplier]);

  // Загрузка ассетов
  useEffect(() => {
    async function loadAnimations() {
      try {
        const pako = await import('pako');
        
        const rocketResponse = await fetch('/assets/MainPage/rocket.tgs');
        const rocketCompressed = await rocketResponse.arrayBuffer();
        setAnimationData(JSON.parse(pako.inflate(rocketCompressed, { to: 'string' })));

        try {
          const exResponse = await fetch('/assets/MainPage/ex1.tgs');
          const exCompressed = await exResponse.arrayBuffer();
          setExAnimationData(JSON.parse(pako.inflate(exCompressed, { to: 'string' })));
          console.log('✅ Explosion animation loaded');
        } catch (exError) {
          console.log('ex.tgs not found, using rocket as fallback');
          setExAnimationData(JSON.parse(pako.inflate(rocketCompressed, { to: 'string' })));
        }

        setLoading(false);
      } catch (error) {
        console.error('Animation loading error:', error);
        setLoading(false);
      }
    }
    loadAnimations();
  }, []);

  const vibrate = (pattern = 50) => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    } else if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  const vibrateTriple = () => {
    if (!window.Telegram?.WebApp?.HapticFeedback) {
      if (navigator.vibrate) navigator.vibrate([50, 900, 50, 100, 50, 100, 50, 100, 50, 100, 50]);
      return;
    }
    try {
      let delay = 900;
      for (let i = 0; i < 6; i++) {
        setTimeout(() => {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }, i === 0 ? 0 : delay + (i - 1) * 100);
      }
    } catch (error) {
      console.error('Vibration error:', error);
    }
  };

  // --- ЛОГИКА СТАВОК UI ---

  const handleMakeBet = () => {
    if (!wsConnected) {
      showUiError('Connecting to server...');
      return;
    }
    
    const hasAnyActiveBet = myBet || recentlyPlacedBet;
    if (hasAnyActiveBet) {
      handleTakeWinnings();
      return;
    }
    
    if (!canBet) {
      if (stage === 'rocket' || stage === 'explosion') {
        showUiError('Wait for next round!');
      } else if (bettingLocked) {
        showUiError('Betting is locked for this round');
      } else if (secondsToBetsClose !== null && secondsToBetsClose <= 0) {
        showUiError('Betting closed for this round');
      } else {
        showUiError('Betting closed for this round.');
      }
      return;
    }
    
    setIsBetModalOpen(true);
    setIsModalClosing(false);
    setIsDropdownOpen(false);
  };

  const closeBetModal = () => {
    setIsModalClosing(true);
    setTimeout(() => {
      setIsBetModalOpen(false);
      setIsModalClosing(false);
      setBetAmount('');
      setIsDropdownOpen(false);
    }, 300);
  };

  const handleCurrencySelect = (currency) => {
    setSelectedCurrency(currency.toLowerCase());
    setIsDropdownOpen(false);
  };

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);
  
  const handleBetChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) setBetAmount(value);
  };

  const handleQuickBet = (amount) => setBetAmount(amount.toString());
  
  const getQuickBetValues = () => selectedCurrency === 'ton' ? ['1', '5', '10', '25'] : ['50', '100', '250', '500'];

  // Функция форматирования времени - просто отображает серверное значение без изменений
  const formatTime = (seconds) => {
    if (seconds === undefined || seconds === null || isNaN(seconds)) return '15';
    // Просто берем целую часть, без дробной
    const secs = Math.floor(seconds);
    return secs.toString().padStart(2, '0');
  };

  const increaseMultiplier = () => {
    if (payoutMultiplier < 10.0) setPayoutMultiplier((prev) => parseFloat((prev + 0.1).toFixed(1)));
  };

  const decreaseMultiplier = () => {
    if (payoutMultiplier > 1.2) setPayoutMultiplier((prev) => parseFloat((prev - 0.1).toFixed(1)));
  };

  const handlePlayBet = async () => {
    if (!betAmount || parseFloat(betAmount) <= 0) {
      showUiError('Please enter a valid bet amount');
      return;
    }
    
    const betAmountNum = parseFloat(betAmount);
    
    if (!checkBalance(selectedCurrency, betAmountNum)) {
      showUiError(`Insufficient ${selectedCurrency.toUpperCase()} balance`);
      return;
    }
    
    if (!canBet) {
      showUiError('Cannot place bet at this moment');
      return;
    }
    
    const success = placeBet(selectedCurrency, betAmountNum, autoPayoutEnabled ? payoutMultiplier : null);
    
    if (success) {
      if (updateBalanceImmediately) {
        updateBalanceImmediately(selectedCurrency, -betAmountNum);
      }
      
      hasPlacedBetThisRoundRef.current = true;
      
      const tempBet = {
        bet_id: Date.now(),
        id: Date.now(),
        user_id: userData?.id || 0,
        currency: selectedCurrency,
        amount: betAmountNum,
        original_amount: betAmountNum,
        current_amount: betAmountNum,
        status: 'placed',
        x: null,
        user: userData ? { 
          id: userData.id, 
          username: userData.username, 
          photo_url: userData.photo_url 
        } : null
      };
      
      lastTempBetIdRef.current = tempBet.bet_id;
      setRecentlyPlacedBet(tempBet);
      closeBetModal();
      
      setTimeout(() => {
        loadBalances();
        window.dispatchEvent(new CustomEvent('balanceUpdate'));
      }, 100);
      
      setTimeout(() => {
        setRecentlyPlacedBet(prev => {
          if (!prev) return null;
          const prevBetId = prev.bet_id ?? prev.id;
          return prevBetId === lastTempBetIdRef.current ? null : prev;
        });
      }, 5000);
    } else {
      showUiError('Failed to place bet. Betting might be closed.');
    }
  };

  const handleTakeWinnings = async () => {
    const hasAnyActiveBet = myBet || recentlyPlacedBet;
    
    if (!hasAnyActiveBet) {
      showUiError('No active bet found!');
      return;
    }
    
    if (cashoutPending) {
      showUiError('Cashout already in progress!');
      return;
    }
    
    console.log('💰 Attempting cashout:');
    console.log('- canCashout:', canCashout);
    console.log('- roundStatus:', roundStatus);
    console.log('- myBet:', myBet);
    console.log('- recentlyPlacedBet:', recentlyPlacedBet);
    
    if (!canCashout) {
      showUiError('Cannot cashout at this moment');
      return;
    }
    
    setCashoutPending(true);
    
    const betToCashout = myBet || recentlyPlacedBet;
    console.log('- Cashing out bet ID:', betToCashout?.bet_id);
    
    const success = cashoutBet();
    console.log('- Cashout success:', success);
    
    if (!success) {
      setCashoutPending(false);
    } else {
      if (betToCashout && betToCashout.amount && multiplierNow > 1.0) {
        const winAmount = betToCashout.amount * multiplierNow;
        if (updateBalanceImmediately) {
          updateBalanceImmediately(betToCashout.currency, winAmount);
        }
      }
    }
  };

  // UI Helpers
  const getAvatarColor = (userId) => {
    const colors = ['#6971FF', '#45B7D1', '#96CEB4', '#FFEAA7', '#FF6B6B'];
    return colors[userId % colors.length];
  };

  const getParticipantAvatar = (participant) => {
    if (participant.user?.photo_url) {
      return (
        <img 
          src={participant.user.photo_url} 
          alt="User" 
          className="participant-avatar-img" 
          onError={(e) => { 
            e.target.style.display = 'none'; 
            e.target.parentNode.style.backgroundColor = getAvatarColor(participant.user_id); 
          }} 
        />
      );
    }
    
    if (userData && participant.user_id === userData.id && userData.photo_url) {
      return (
        <img 
          src={userData.photo_url} 
          alt="User" 
          className="participant-avatar-img" 
          onError={(e) => { 
            e.target.style.display = 'none'; 
            e.target.parentNode.style.backgroundColor = getAvatarColor(participant.user_id); 
          }} 
        />
      );
    }
    
    return null;
  };

  const getParticipantUsername = (participant) => {
    if (participant.user?.username) return participant.user.username;
    if (userData && participant.user_id === userData.id) return userData.username || `User${participant.user_id}`;
    return `User${participant.user_id}`;
  };

  const getDisplayMultiplier = () => {
    if (stage === 'explosion' && crashMultiplier) {
      return `x${crashMultiplier.toFixed(2)}`;
    }
    if (stage === 'timer') {
      if (roundStatus === 'betting') return 'Place bets';
      if (roundStatus === 'countdown') return 'Starting...';
      return 'Waiting...';
    }
    if (!wsConnected) return 'Connecting...';
    return `x${(multiplierNow || 1.0).toFixed(2)}`;
  };

  const getButtonText = () => {
    const hasAnyActiveBet = myBet || recentlyPlacedBet;
    if (hasAnyActiveBet) {
      return cashoutPending ? 'CASHING OUT...' : 'TAKE WINNINGS';
    }
    return 'MAKE A BET';
  };

  const handleMainButtonClick = () => {
    const hasAnyActiveBet = myBet || recentlyPlacedBet;
    if (hasAnyActiveBet) {
      handleTakeWinnings();
    } else {
      handleMakeBet();
    }
  };

  const isMainButtonActive = () => {
    const hasAnyActiveBet = myBet || recentlyPlacedBet;
    
    if (hasAnyActiveBet) {
      if (myBet?.status === 'win' || myBet?.status === 'lose') return false;
      return canCashout && !cashoutPending;
    }
    
    return canBet;
  };

  const getButtonClass = () => {
    const baseClass = 'make-bet-button';
    const hasAnyActiveBet = myBet || recentlyPlacedBet;
    
    if (!isMainButtonActive()) {
      return `${baseClass} disabled`;
    }
    
    if (hasAnyActiveBet) {
      return cashoutPending ? `${baseClass} cashout-button pending` : `${baseClass} cashout-button`;
    }
    
    return baseClass;
  };

  const getDisplayMultipliers = () => {
    return lastMultipliersHistory.length > 0 ? lastMultipliersHistory : (lastMultipliers || []);
  };

  const getCurrentBetAmount = (participant) => {
    if (participant.status === 'win' && participant.x) {
      return (participant.amount * participant.x).toFixed(2);
    }
    if (participant.status === 'placed') {
      return (participant.amount * multiplierNow).toFixed(2);
    }
    if (participant.status === 'lose' && participant.x) {
      return (participant.amount * participant.x).toFixed(2);
    }
    if (participant.status === 'win' && participant.payout) {
      return participant.payout.toFixed(2);
    }
    
    return participant.amount.toFixed(2);
  };

  const isMyBet = (participant) => {
    if (!userData) return false;
    if (participant.user_id === userData.id) return true;
    
    const participantId = participant.bet_id ?? participant.id;
    const myBetId = myBet?.bet_id ?? myBet?.id;
    const recentId = recentlyPlacedBet?.bet_id ?? recentlyPlacedBet?.id;
    
    return (myBetId && participantId === myBetId) || (recentId && participantId === recentId);
  };

  const getBetStatus = (participant) => {
    if (participant.status === 'win') return 'win';
    if (participant.status === 'lose') return 'lose';
    if (participant.status === 'placed') return 'placed';
    return 'placed';
  };

  return (
    <div className="rocket-screen">
      <Header onNavigate={onNavigate} />
      <main className="rocket-content">
        <div className="rocket-container">
          <div className="multiplier-container">
            <span className="multiplier-text">{getDisplayMultiplier()}</span>
          </div>
  
          <div className="rocket-game-area">
            <div className="video-container">
              {loading ? (
                <div className="loading-animation">Loading...</div>
              ) : (
                <>
                  {stage === 'timer' && (
                    <div className="timer-container">
                      <img src={timerImg} alt="Timer" className="timer-image" />
                      {/* ТАЙМЕР ТОЛЬКО ОТ СЕРВЕРА - никакой локальной анимации */}
                      <div className="timer-text">{formatTime(secondsToStart)}</div>
                    </div>
                  )}
                  
                  {stage === 'rocket' && animationData && (
                    <div className="animation-container" key="rocket-animation">
                      <Lottie 
                        animationData={animationData} 
                        loop={true} 
                        autoplay={true} 
                        className="raketa-animation" 
                        speed={1.5} 
                      />
                    </div>
                  )}
                  
                  {stage === 'explosion' && exAnimationData && (
                    <div className="explosion-container" key={`explosion-${Date.now()}`}>
                      <Lottie 
                        animationData={exAnimationData} 
                        loop={false} 
                        autoplay={true} 
                        className="explosion-animation" 
                        speed={1.2}
                        lottieRef={(ref) => { 
                          console.log('💥 Explosion ref set:', ref ? 'valid' : 'null');
                          explosionAnimationRef.current = ref;
                          if (ref) {
                            ref.setSpeed(1.2);
                            ref.goToAndPlay(0, true);
                          }
                        }}
                        onComplete={handleExplosionComplete}
                      />
                    </div>
                  )}
                  
                  {!animationData && !exAnimationData && !loading && (
                    <div className="error-message">Failed to load animation</div>
                  )}
                </>
              )}
            </div>
  
            <div className="last-multipliers-container">
              <div className="last-multipliers-scroll">
                {getDisplayMultipliers().map((m, i) => (
                  <span 
                    key={i} 
                    className={`last-multiplier-item ${i === 0 && engineEvents.crash ? 'new' : ''}`}
                  >
                    x{m.toFixed(2)}
                  </span>
                ))}
              </div>
            </div>
  
            <div className="participants-table-container">
              <table className="participants-table">
                <thead className="participants-thead">
                  <tr>
                    <th className="participants-header-cell bet-column">BET</th>
                    <th className="participants-header-cell winning-column">WINNING</th>
                  </tr>
                </thead>
                <tbody className="participants-tbody">
                  {!wsConnected ? (
                    <tr className="participants-row">
                      <td colSpan="2" style={{ textAlign: 'center', color: '#333', padding: '20px' }}>
                        Connecting to server...
                      </td>
                    </tr>
                  ) : participants.length > 0 ? (
                    participants.map((participant) => {
                      const isMyBetFlag = isMyBet(participant);
                      const avatarColor = getAvatarColor(participant.user_id);
                      const avatarElement = getParticipantAvatar(participant);
                      const username = getParticipantUsername(participant);
                      const betKey = participant.bet_id ?? participant.id ?? `temp-${participant.user_id}-${Date.now()}`;
                      const currentAmount = getCurrentBetAmount(participant);
                      const betStatus = getBetStatus(participant);
                      
                      let multiplierColor = '';
                      let statusIcon = null;
                      
                      if (betStatus === 'win') {
                        multiplierColor = 'multiplier-green';
                        statusIcon = <span className="check-icon">✓</span>;
                      } else if (betStatus === 'lose') {
                        multiplierColor = 'multiplier-red';
                        statusIcon = <span className="cross-icon">✗</span>;
                      } else if (isMyBetFlag) {
                        multiplierColor = 'my-bet';
                      }

                      return (
                        <tr key={betKey} className={`participants-row ${isMyBetFlag ? 'my-bet-row' : ''}`}>
                          <td className="participant-bet-cell">
                            <div 
                              className="participant-avatar" 
                              style={{ backgroundColor: avatarElement ? 'transparent' : avatarColor }}
                            >
                              {avatarElement || (
                                <span className="fallback">
                                  {username?.[0]?.toUpperCase() || 'U'}
                                </span>
                              )}
                            </div>
                            <div className="participant-info">
                              <div className="participant-nickname">
                                {username}
                              </div>
                              <div className="participant-bet-currency">
                                <img 
                                  src={participant.currency === 'ton' ? tonSvg : starSvg} 
                                  alt={participant.currency} 
                                  className="currency-icon-small" 
                                  style={{ marginTop: '-1px' }} 
                                />
                                <span className="participant-bet">{currentAmount}</span>
                              </div>
                            </div>
                          </td>
                          <td className="participant-winning-cell">
                            {betStatus === 'placed' ? (
                              <span className="participant-multiplier">
                                <span className={`live-multiplier ${isMyBetFlag ? 'my-multiplier' : ''}`}>
                                  x{multiplierNow.toFixed(2)}
                                </span>
                              </span>
                            ) : (
                              <span className={`participant-multiplier ${multiplierColor}`}>
                                x{participant.x?.toFixed(2) || '0.00'} {statusIcon}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr className="participants-row no-bets-row">
                      <td colSpan="2" className="no-bets-message">
                        {'No bets yet'.split('').map((char, index) => (
                          <span 
                            key={index} 
                            className={char === ' ' ? 'space' : 'char'} 
                            style={char === ' ' ? { width: '0.3em' } : {}}
                          >
                            {char === ' ' ? '\u00A0' : char}
                          </span>
                        ))}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
  
            <div className="make-bet-button-container">
              <button 
                className={getButtonClass()} 
                onClick={handleMainButtonClick} 
                disabled={!isMainButtonActive()}
              >
                <span className="make-bet-text">{getButtonText()}</span>
              </button>
            </div>
          </div>
        </div>
      </main>
  
      {uiErrorMessage && (
        <div className="ui-error-message">
          <div className="ui-error-content">{uiErrorMessage}</div>
        </div>
      )}
  
      {isBetModalOpen && (
        <div 
          className={`bet-modal-overlay ${isModalClosing ? 'closing' : ''}`} 
          onClick={closeBetModal}
        >
          <div 
            className={`bet-modal-content ${isModalClosing ? 'closing' : ''}`} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bet-modal-top-section">
              <div className="bet-label">Your bet</div>
              
              <div className="bet-input-container">
                <div className="bet-input-wrapper">
                  <span className={`bet-input-placeholder ${betAmount ? 'hidden' : ''}`}>
                    Enter
                  </span>
                  <input 
                    ref={betInputRef} 
                    type="text" 
                    className="bet-input" 
                    value={betAmount} 
                    onChange={handleBetChange} 
                    placeholder="" 
                    inputMode="decimal" 
                    style={{ fontSize: '16px' }}
                  />
                  
                  <div 
                    className="currency-selector" 
                    onClick={toggleDropdown} 
                    ref={currencyDropdownRef}
                  >
                    <img 
                      src={selectedCurrency === 'ton' ? tonSvg : starSvg} 
                      alt={selectedCurrency} 
                      className="currency-icon" 
                    />
                    <img 
                      src={isDropdownOpen ? switchSvg : switchbSvg} 
                      alt="switch" 
                      className="currency-switch" 
                    />
                    
                    {isDropdownOpen && (
                      <div className="currency-dropdown">
                        <div 
                          className={`dropdown-item ${selectedCurrency === 'ton' ? 'selected' : ''}`} 
                          onClick={() => handleCurrencySelect('ton')}
                        >
                          TON
                        </div>
                        <div 
                          className={`dropdown-item ${selectedCurrency === 'stars' ? 'selected' : ''}`} 
                          onClick={() => handleCurrencySelect('stars')}
                        >
                          STARS
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="quick-bet-buttons">
                {getQuickBetValues().map((value) => (
                  <div 
                    key={value} 
                    className="quick-bet-button" 
                    onClick={() => handleQuickBet(value)}
                  >
                    <span className="quick-bet-value">{value}</span>
                  </div>
                ))}
              </div>
              
              <div className="auto-payout-section">
                <div className="auto-payout-row">
                  <span className="auto-payout-label">Auto-payout</span>
                  <Switch 
                    size="small" 
                    checked={autoPayoutEnabled} 
                    onChange={setAutoPayoutEnabled} 
                  />
                </div>
                
                <div className={`multiplier-input-wrapper ${!autoPayoutEnabled ? 'disabled' : ''}`}>
                  <div 
                    className={`multiplier-arrow left ${payoutMultiplier <= 1.2 ? 'disabled' : ''}`} 
                    onClick={payoutMultiplier > 1.2 ? decreaseMultiplier : undefined}
                  >
                    <img src={switchrSvg} alt="left" />
                  </div>
                  
                  <span className="multiplier-value">x{payoutMultiplier.toFixed(1)}</span>
                  
                  <div 
                    className="multiplier-arrow right" 
                    onClick={increaseMultiplier}
                  >
                    <img src={switchrSvg} alt="right" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="modal-buttons-container">
              <button 
                className="play-button-balls" 
                onClick={handlePlayBet} 
                disabled={!betAmount || parseFloat(betAmount) <= 0}
              >
                PLAY
              </button>
              <button 
                className="close-modal-rocket-button" 
                onClick={closeBetModal}
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}