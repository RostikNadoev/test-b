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
  
  const currencyDropdownRef = useRef(null);
  const betInputRef = useRef(null);
  const historyUpdateIntervalRef = useRef(null);
  const explosionAnimationRef = useRef(null);
  const lastTempBetIdRef = useRef(null);
  const uiErrorTimeoutRef = useRef(null);
  const hasPlacedBetThisRoundRef = useRef(false);
  
  const { balances, checkBalance, loadBalances, updateBalanceImmediately } = useBalance();

  const {
    multiplierNow,
    roundStatus,
    timeLeft,
    wsConnected,
    bets: participants,
    placeBet,
    cashoutBet,
    canBet,
    canCashout,
    isCrashGameActive,
    engineEvents,
    stage,
    setStage, 
    myActiveBet,
    lastMultipliers,
    crashMultiplier,
    getHistoryFromBackend,
    clearBetsOnCrash,
    currentRoundId
  } = useCrashGame();

  // Синхронная очистка локальных стейтов при смене раунда
  useEffect(() => {
    if (currentRoundId) {
      hasPlacedBetThisRoundRef.current = false;
      setRecentlyPlacedBet(null);
      lastTempBetIdRef.current = null;
    }
  }, [currentRoundId]);

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

  // Обработка кэшаута и результата ставки
  useEffect(() => {
    if (engineEvents.cashout_ok || engineEvents.bet_result) {
      setCashoutPending(false);
      setRecentlyPlacedBet(null);
      setTimeout(() => {
        loadBalances();
        window.dispatchEvent(new CustomEvent('balanceUpdate'));
      }, 300);
    }
  }, [engineEvents.cashout_ok, engineEvents.bet_result, loadBalances]);

  useEffect(() => {
    if (engineEvents.crash) {
      vibrateTriple();
    }
  }, [engineEvents.crash]);

  // Управление взрывом
  useEffect(() => {
    if (stage === 'explosion' && explosionAnimationRef.current) {
      explosionAnimationRef.current.goToAndPlay(0, true);
    }
  }, [stage]);

  const handleExplosionComplete = useCallback(() => {
    // Небольшая задержка для красоты, затем жесткая очистка
    setTimeout(() => {
      setStage('timer');
      if (clearBetsOnCrash) clearBetsOnCrash();
    }, 400);
  }, [clearBetsOnCrash, setStage]);

  // Загрузка истории
  useEffect(() => {
    const loadHistory = async () => {
      const history = await getHistoryFromBackend();
      if (history && Array.isArray(history)) {
        setLastMultipliersHistory(history.map(item => item.crash_multiplier || 1.0));
      }
    };
    loadHistory();
    const interval = setInterval(loadHistory, 10000);
    return () => clearInterval(interval);
  }, [getHistoryFromBackend]);

  // Загрузка анимаций (pako)
  useEffect(() => {
    async function loadAnimations() {
      try {
        const pako = await import('pako');
        const rocketResponse = await fetch('/assets/MainPage/rocket.tgs');
        const rocketCompressed = await rocketResponse.arrayBuffer();
        const rData = JSON.parse(pako.inflate(rocketCompressed, { to: 'string' }));
        setAnimationData(rData);

        try {
          const exResponse = await fetch('/assets/MainPage/ex1.tgs');
          const exCompressed = await exResponse.arrayBuffer();
          setExAnimationData(JSON.parse(pako.inflate(exCompressed, { to: 'string' })));
        } catch {
          setExAnimationData(rData);
        }
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    }
    loadAnimations();
  }, []);

  const handlePlayBet = async () => {
    if (!betAmount || parseFloat(betAmount) <= 0) return;
    const betAmountNum = parseFloat(betAmount);
    
    if (!checkBalance(selectedCurrency, betAmountNum)) {
      showUiError(`Insufficient ${selectedCurrency.toUpperCase()} balance`);
      return;
    }

    const success = placeBet(selectedCurrency, betAmountNum, autoPayoutEnabled ? payoutMultiplier : null);
    if (success) {
      if (updateBalanceImmediately) updateBalanceImmediately(selectedCurrency, -betAmountNum);
      hasPlacedBetThisRoundRef.current = true;
      
      const tempBet = {
        bet_id: Date.now(),
        user_id: userData?.id || 0,
        currency: selectedCurrency,
        amount: betAmountNum,
        status: 'placed',
        user: userData ? { id: userData.id, username: userData.username, photo_url: userData.photo_url } : null
      };
      setRecentlyPlacedBet(tempBet);
      closeBetModal();
    }
  };

  const formatTime = (seconds) => seconds.toString().padStart(2, '0');

  const getDisplayMultiplier = () => {
    if (stage === 'explosion' && crashMultiplier) return `x${crashMultiplier.toFixed(2)}`;
    if (stage === 'timer' && roundStatus === 'betting') return 'Waiting...';
    return `x${(multiplierNow || 1.0).toFixed(2)}`;
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
              {loading ? <div className="loading-animation">Loading...</div> : (
                <>
                  {stage === 'timer' && (
                    <div className="timer-container">
                      <img src={timerImg} alt="Timer" className="timer-image" />
                      <div className="timer-text">{formatTime(timeLeft)}</div>
                    </div>
                  )}
                  {stage === 'rocket' && animationData && (
                    <div className="animation-container">
                      <Lottie animationData={animationData} loop={true} autoplay={true} className="raketa-animation" />
                    </div>
                  )}
                  {stage === 'explosion' && exAnimationData && (
                    <div className="explosion-container">
                      <Lottie 
                        animationData={exAnimationData} 
                        loop={false} 
                        autoplay={true} 
                        onComplete={handleExplosionComplete}
                        lottieRef={(ref) => { explosionAnimationRef.current = ref; }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="participants-table-container">
              <table className="participants-table">
                <thead className="participants-thead">
                  <tr>
                    <th className="participants-header-cell">BET</th>
                    <th className="participants-header-cell">WINNING</th>
                  </tr>
                </thead>
                <tbody className="participants-tbody">
                  {participants.length > 0 ? participants.map((participant) => {
                    const isMy = userData && participant.user_id === userData.id;
                    const betKey = participant.bet_id || participant.id;
                    return (
                      <tr key={betKey} className={`participants-row ${isMy ? 'my-bet-row' : ''}`}>
                        <td className="participant-bet-cell">
                          <div className="participant-info">
                            <span className="participant-nickname">{participant.user?.username || 'User'}</span>
                            <div className="participant-bet-currency">
                               <img src={participant.currency === 'ton' ? tonSvg : starSvg} className="currency-icon-small" alt=""/>
                               <span className="participant-bet">{participant.amount}</span>
                            </div>
                          </div>
                        </td>
                        <td className="participant-winning-cell">
                          <span className={`participant-multiplier ${participant.status}`}>
                            {participant.status === 'placed' ? `x${multiplierNow.toFixed(2)}` : `x${participant.x?.toFixed(2) || '0.00'}`}
                          </span>
                        </td>
                      </tr>
                    );
                  }) : <tr className="no-bets-row"><td colSpan="2">No bets yet</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="make-bet-button-container">
              <button className={`make-bet-button ${!canBet && !canCashout ? 'disabled' : ''}`} onClick={() => (canCashout ? cashoutBet() : setIsBetModalOpen(true))}>
                {canCashout ? 'TAKE WINNING' : 'MAKE A BET'}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Модалка аналогична вашей, но с исправленным вызовом handlePlayBet */}
      {isBetModalOpen && (
        <div className="bet-modal-overlay" onClick={() => setIsBetModalOpen(false)}>
          <div className="bet-modal-content" onClick={e => e.stopPropagation()}>
             <input type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)} />
             <button onClick={handlePlayBet}>PLAY</button>
          </div>
        </div>
      )}
    </div>
  );
}