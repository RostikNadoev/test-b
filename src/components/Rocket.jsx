import '../styles/Rocket.css';
import Header from './Header';
import Lottie from 'lottie-react';
import React, { useState, useEffect, useRef } from 'react';
import timerImg from '../assets/Rocket/timer.png';
import tonSvg from '../assets/MainPage/ton.svg';
import starSvg from '../assets/MainPage/star1.png';
import switchSvg from '../assets/MainPage/switch.svg';
import switchbSvg from '../assets/MainPage/switchd.svg';
import switchrSvg from '../assets/Rocket/switchr.svg'; // ← стрелка
import { Switch } from 'antd'; // ← Ant Design Switch

export default function Rocket({ 
  onNavigate, 
  currentCardIndex = 2 
}) {
  const [animationData, setAnimationData] = useState(null);
  const [exAnimationData, setExAnimationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState('timer');
  const [timeLeft, setTimeLeft] = useState(15);
  const [multiplier, setMultiplier] = useState('Waiting...');
  const [targetMultiplier, setTargetMultiplier] = useState(2.81);
  const [isAnimating, setIsAnimating] = useState(false);
  const [lastMultipliers, setLastMultipliers] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(true);
  const [isBetModalOpen, setIsBetModalOpen] = useState(false);
  const [isModalClosing, setIsModalClosing] = useState(false);

  // Состояния для ставок
  const [selectedCurrency, setSelectedCurrency] = useState('TON');
  const [betAmount, setBetAmount] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Новое состояние: Auto-payout и multiplier
  const [autoPayoutEnabled, setAutoPayoutEnabled] = useState(false);
  const [payoutMultiplier, setPayoutMultiplier] = useState(1.2); // начальное значение

  const timerRef = useRef(null);
  const multiplierIntervalRef = useRef(null);
  const explosionTimeoutRef = useRef(null);
  const isVibrationSupported = useRef(false);
  const currencyDropdownRef = useRef(null);
  const betInputRef = useRef(null);

  // Мок-данные участников
  const mockParticipants = [
    {
      id: 1,
      nickname: "Bounce",
      bet: "15.8",
      avatarColor: "#6971FF"
    },
    {
      id: 2,
      nickname: "Bounce2",
      bet: "25.3",
      avatarColor: "#6971FF"
    },
    {
      id: 3,
      nickname: "MoonShooter",
      bet: "8.7 USDT",
      avatarColor: "#45B7D1"
    },
    {
      id: 4,
      nickname: "BullRunner",
      bet: "42.1 USDT",
      avatarColor: "#96CEB4"
    },
    {
      id: 5,
      nickname: "DiamondHands",
      bet: "19.5 USDT",
      avatarColor: "#FFEAA7"
    }
  ];

  // Проверка поддержки вибрации
  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      isVibrationSupported.current = true;
    } else if (navigator.vibrate) {
      isVibrationSupported.current = true;
    }
  }, []);

  // Закрытие dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Эффект для управления скроллом при открытии/закрытии модалки
  useEffect(() => {
    if (isBetModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isBetModalOpen]);

  // Имитация загрузки данных участников от API
  useEffect(() => {
    const loadParticipants = () => {
      setLoadingParticipants(true);
      setTimeout(() => {
        setParticipants(mockParticipants);
        setLoadingParticipants(false);
      }, 500);
    };

    loadParticipants();
  }, []);

  const vibrate = (pattern = 50) => {
    if (!isVibrationSupported.current) return;
    try {
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
      } else if (navigator.vibrate) {
        typeof pattern === 'number' ? navigator.vibrate(pattern) : navigator.vibrate(pattern);
      }
    } catch (error) {
      console.error('Vibration error:', error);
    }
  };

  const vibrateTriple = () => {
    if (!isVibrationSupported.current) return;
    try {
      if (window.Telegram?.WebApp) {
        const taps = 6;
        let delay = 1080;
        for (let i = 0; i < taps; i++) {
          setTimeout(() => {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
          }, i === 0 ? 0 : delay + (i - 1) * 120);
        }
      } else if (navigator.vibrate) {
        navigator.vibrate([60, 1080, 60, 120, 60, 120, 60, 120, 60, 120, 60]);
      }
    } catch (error) {
      console.error('Six vibration error:', error);
    }
  };

  const generateRandomMultiplier = () => {
    return (Math.random() * 8.99 + 1.01).toFixed(2);
  };

  useEffect(() => {
    async function loadAnimations() {
      try {
        const rocketResponse = await fetch('/assets/MainPage/rocket.tgs');
        const rocketCompressed = await rocketResponse.arrayBuffer();
        const pako = await import('pako');
        const rocketDecompressed = pako.inflate(rocketCompressed, { to: 'string' });
        setAnimationData(JSON.parse(rocketDecompressed));

        try {
          const exResponse = await fetch('/assets/MainPage/ex1.tgs');
          const exCompressed = await exResponse.arrayBuffer();
          const exDecompressed = pako.inflate(exCompressed, { to: 'string' });
          setExAnimationData(JSON.parse(exDecompressed));
        } catch (exError) {
          console.log('ex.tgs not found, using rocket as fallback');
          setExAnimationData(JSON.parse(rocketDecompressed));
        }

        setLoading(false);
      } catch (error) {
        console.error('Animation loading error:', error);
        setLoading(false);
      }
    }

    loadAnimations();
    setTargetMultiplier(parseFloat(generateRandomMultiplier()));

    return () => {
      clearInterval(timerRef.current);
      clearInterval(multiplierIntervalRef.current);
      clearTimeout(explosionTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (stage === 'rocket' && !isAnimating) {
      setLastMultipliers(prev => [parseFloat(targetMultiplier.toFixed(2)), ...prev.slice(0, 9)]);
    }
  }, [stage, isAnimating, targetMultiplier]);

  useEffect(() => {
    if (stage === 'timer') {
      if (timeLeft > 0) {
        if (timeLeft === 15) vibrate();
        timerRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              vibrate(100);
              setStage('rocket');
              setIsAnimating(true);
              setMultiplier('1.00');
              return 0;
            }
            if (prev > 1) vibrate();
            return prev - 1;
          });
        }, 1000);
      }
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [stage, timeLeft]);

  useEffect(() => {
    if (stage === 'rocket' && isAnimating) {
      vibrate(150);
      const speedPerSecond = 1 / 6;
      const updateInterval = 50;
      const incrementPerUpdate = speedPerSecond * (updateInterval / 1000);
      let currentMultiplier = 1.00;

      multiplierIntervalRef.current = setInterval(() => {
        currentMultiplier += incrementPerUpdate;
        const currentMultiplierFormatted = Math.min(currentMultiplier, targetMultiplier).toFixed(2);

        if (currentMultiplier >= targetMultiplier) {
          clearInterval(multiplierIntervalRef.current);
          setMultiplier(targetMultiplier.toFixed(2));
          vibrate(200);
          setIsAnimating(false);
          setTimeout(() => {
            setStage('explosion');
            vibrateTriple();
          }, 0);
        } else {
          setMultiplier(currentMultiplierFormatted);
        }
      }, updateInterval);
    } else {
      clearInterval(multiplierIntervalRef.current);
    }
    return () => clearInterval(multiplierIntervalRef.current);
  }, [stage, isAnimating, targetMultiplier]);

  useEffect(() => {
    if (stage === 'explosion') {
      explosionTimeoutRef.current = setTimeout(() => {
        const newMultiplier = parseFloat(generateRandomMultiplier());
        setTargetMultiplier(newMultiplier);
        setStage('timer');
        setTimeLeft(15);
        setMultiplier('Waiting...');
        vibrate(50);
      }, 2900);
    }
    return () => clearTimeout(explosionTimeoutRef.current);
  }, [stage]);

  const handleMakeBet = () => {
    vibrate(100);
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
    setSelectedCurrency(currency);
    setIsDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleBetChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setBetAmount(value);
    }
  };

  const handleQuickBet = (amount) => {
    setBetAmount(amount.toString());
  };

  const getQuickBetValues = () => {
    if (selectedCurrency === 'TON') {
      return ['1', '5', '10', '25'];
    } else {
      return ['50', '100', '250', '500'];
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Управление множителем авто-выплаты
  const increaseMultiplier = () => {
    if (payoutMultiplier < 10.0) {
      setPayoutMultiplier((prev) => parseFloat((prev + 0.1).toFixed(1)));
    }
  };

  const decreaseMultiplier = () => {
    if (payoutMultiplier > 1.2) {
      setPayoutMultiplier((prev) => parseFloat((prev - 0.1).toFixed(1)));
    }
  };

  return (
    <div className="rocket-screen">
      <Header onNavigate={onNavigate} />
  
      <main className="rocket-content">
        <div className="rocket-container">
          <div className="multiplier-container">
            <span className="multiplier-text">
              {typeof multiplier === 'string' ? multiplier : `x${multiplier}`}
            </span>
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
                      <div className="timer-text">{formatTime(timeLeft)}</div>
                    </div>
                  )}
                  {stage === 'rocket' && animationData && (
                    <div className="animation-container">
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
                    <div className="explosion-container">
                      <Lottie
                        animationData={exAnimationData}
                        loop={false}
                        autoplay={true}
                        className="explosion-animation"
                        speed={1}
                      />
                    </div>
                  )}
                  {!animationData && !exAnimationData && !loading && (
                    <div className="error-message">Failed to load animation</div>
                  )}
                </>
              )}
            </div>
  
            {/* Последние множители */}
            <div className="last-multipliers-container">
              <div className="last-multipliers-scroll">
                {lastMultipliers.map((m, i) => (
                  <span key={i} className="last-multiplier-item">
                    x{m}
                  </span>
                ))}
              </div>
            </div>
  
            {/* Таблица участников */}
            <div className="participants-table-container">
              <table className="participants-table">
                <thead className="participants-thead">
                  <tr>
                    <th className="participants-header-cell bet-column">BET</th>
                    <th className="participants-header-cell winning-column">WINNING</th>
                  </tr>
                </thead>
                <tbody className="participants-tbody">
                  {loadingParticipants ? (
                    <tr className="participants-row loading-row">
                      <td colSpan="2" style={{ textAlign: 'center', color: '#333', padding: '20px' }}>
                        Loading participants...
                      </td>
                    </tr>
                  ) : participants.length > 0 ? (
                    participants.map((participant) => (
                      <tr key={participant.id} className="participants-row">
                        <td className="participant-bet-cell">
                          <div
                            className="participant-avatar"
                            style={{ backgroundColor: participant.avatarColor }}
                          ></div>
                          <div className="participant-info">
                            <div className="participant-nickname">{participant.nickname}</div>
                            <div className="participant-bet">{participant.bet}</div>
                          </div>
                        </td>
                        <td className="participant-winning-cell"></td>
                      </tr>
                    ))
                  ) : (
                    <tr className="participants-row empty-row">
                      <td colSpan="2" style={{ textAlign: 'center', color: '#333', padding: '20px' }}>
                        No participants yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
  
            {/* Кнопка MAKE A BET */}
            <div className="make-bet-button-container">
              <button className="make-bet-button" onClick={handleMakeBet}>
                <span className="make-bet-text">MAKE A BET</span>
              </button>
            </div>
          </div>
        </div>
      </main>
  
      {/* Полупрозрачная модалка на весь экран */}
      {isBetModalOpen && (
        <div 
          className={`bet-modal-overlay ${isModalClosing ? 'closing' : ''}`}
          onClick={closeBetModal}
        >
          <div 
            className={`bet-modal-content ${isModalClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Верхняя часть модалки - секция ставки */}
            <div className="bet-modal-top-section">
              <div className="bet-label">Your bet</div>
              
              <div className="bet-input-container">
                <div className="bet-input-wrapper">
                  <span className={`bet-input-placeholder ${betAmount ? 'hidden' : ''}`}>Enter</span>
                  <input 
                    ref={betInputRef}
                    type="text" 
                    className="bet-input"
                    value={betAmount}
                    onChange={handleBetChange}
                    placeholder=""
                    inputMode="decimal"
                  />
                  
                  <div 
                    className="currency-selector"
                    onClick={toggleDropdown}
                    ref={currencyDropdownRef}
                  >
                    <img 
                      src={selectedCurrency === 'TON' ? tonSvg : starSvg} 
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
                          className={`dropdown-item ${selectedCurrency === 'TON' ? 'selected' : ''}`}
                          onClick={() => handleCurrencySelect('TON')}
                        >
                          TON
                        </div>
                        <div 
                          className={`dropdown-item ${selectedCurrency === 'STARS' ? 'selected' : ''}`}
                          onClick={() => handleCurrencySelect('STARS')}
                        >
                          STARS
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Кнопки быстрого ввода */}
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

              {/* Auto-payout блок */}
<div className="auto-payout-section">
  <div className="auto-payout-row">
    <span className="auto-payout-label">Auto-payout</span>
    <Switch
      size="small"
      checked={autoPayoutEnabled}
      onChange={setAutoPayoutEnabled}
    />
  </div>

  {/* Поле множителя */}
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

            {/* === Кнопки PLAY и CLOSE внизу модалки === */}
            <div className="modal-buttons-container">
              <button className="play-button-balls" onClick={() => console.log('PLAY clicked')}>
                PLAY
              </button>
              <button className="close-modal-rocket-button" onClick={closeBetModal}>
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}