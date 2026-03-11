import React, { useRef, useState, useEffect, useCallback } from 'react';
import NeonPlinko from './NeonPlinko';
import Header from './Header';
import '../styles/PlinkoScreen.css';
import tonSvg from '../assets/MainPage/ton.svg';
import starSvg from '../assets/MainPage/star1.png';
import switchSvg from '../assets/MainPage/switch.svg';
import switchbSvg from '../assets/MainPage/switchd.svg';
import rocketBack from '../assets/Plinko/Back.png';
import { bounceFallApi, authApi, usersApi } from '../utils/api';
import { getRandomPreset } from '../utils/bounceFallPresets';
import { useBalance } from '../contexts/BalanceContext';
import { useDemo } from '../contexts/DemoContext';

// Демо-множители для Plinko (сбалансированные шансы)
const DEMO_MULTIPLIERS = [30, 15, 8, 3, 1.5, 0.6, 0.2, 0.6, 1.5, 3, 8, 15, 30];

// Веса для демо-режима (сумма = 100)
const DEMO_WEIGHTS = {
  30: 2,    // 2% шанс на x30
  15: 4,    // 4% шанс на x15
  8: 8,     // 8% шанс на x8
  3: 12,    // 12% шанс на x3
  1.5: 15,  // 15% шанс на x1.5
  0.6: 24,  // 24% шанс на x0.6
  0.2: 35   // 35% шанс на x0.2
};

// Функция для получения случайного множителя в демо-режиме
const getRandomDemoMultiplier = () => {
  const random = Math.random() * 100;
  let cumulative = 0;
  
  for (const [multiplier, weight] of Object.entries(DEMO_WEIGHTS)) {
    cumulative += weight;
    if (random < cumulative) {
      return parseFloat(multiplier);
    }
  }
  
  return 0.2; // fallback
};

// Функция для получения индекса исхода по множителю
const getOutcomeIndexByMultiplier = (multiplier) => {
  const indexMap = {
    30: [2, 14],
    15: [3, 13],
    8: [4, 12],
    3: [5, 11],
    1.5: [6, 10],
    0.6: [7, 9],
    0.2: [8]
  };
  
  for (const [key, indices] of Object.entries(indexMap)) {
    if (parseFloat(key) === multiplier) {
      // Если несколько индексов, выбираем случайный
      if (Array.isArray(indices)) {
        return indices[Math.floor(Math.random() * indices.length)];
      }
      return indices;
    }
  }
  
  return 8; // fallback на x0.2
};

export default function BounceFallScreen({ onNavigate }) {
  const plinkoRef = useRef();
  const currencyDropdownRef = useRef(null);
  const sliderRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('TON');
  const [betAmount, setBetAmount] = useState('');
  const [ballCount, setBallCount] = useState(1);
  const [gameState, setGameState] = useState('idle'); 
  const [totalWinnings, setTotalWinnings] = useState(0);
  const [ballsDropped, setBallsDropped] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [roundData, setRoundData] = useState(null);
  
  // СОСТОЯНИЕ ДЛЯ ЭФФЕКТА ВЫИГРЫША
  const [winEffect, setWinEffect] = useState(null);
  
  const { checkBalance, setNewBalances, loadBalances } = useBalance();
  const { isDemoMode, demoBalance, removeFromDemoBalance, addToDemoBalance } = useDemo();

  // Обработчики для слайдера
  const handleSliderStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleSliderMove = useCallback((e) => {
    if (!isDragging || !sliderRef.current) return;

    e.preventDefault();
    
    const slider = sliderRef.current;
    const rect = slider.getBoundingClientRect();
    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    
    let x = clientX - rect.left;
    x = Math.max(0, Math.min(x, rect.width));
    
    const percentage = x / rect.width;
    const newValue = Math.round(1 + percentage * 9); // от 1 до 10
    setBallCount(newValue);
  }, [isDragging]);

  const handleSliderEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleSliderMove);
      window.addEventListener('mouseup', handleSliderEnd);
      window.addEventListener('touchmove', handleSliderMove, { passive: false });
      window.addEventListener('touchend', handleSliderEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleSliderMove);
        window.removeEventListener('mouseup', handleSliderEnd);
        window.removeEventListener('touchmove', handleSliderMove);
        window.removeEventListener('touchend', handleSliderEnd);
      };
    }
  }, [isDragging, handleSliderMove, handleSliderEnd]);

  const handleBallLand = useCallback((multiplier) => {
    setBallsDropped(prev => {
      const newDropped = prev + 1;
      if (newDropped >= ballCount) {
        setTimeout(() => setGameState('finished'), 500);
      }
      return newDropped;
    });

    if (multiplier > 0) {
      const bet = parseFloat(betAmount) || 0;
      const ballWinnings = bet * multiplier;
      
      // --- ЛОГИКА ЭФФЕКТОВ (КАК В КАЗИНО) ---
      // Если множитель >= 8x, показываем спецэффект
      if (multiplier >= 8) {
        const effectId = Date.now();
        // Определяем тип эффекта по силе множителя
        let type = 'medium'; // для x8
        if (multiplier >= 15) type = 'high'; // для x15
        if (multiplier >= 30) type = 'insane'; // для x30

        setWinEffect({ id: effectId, multiplier, type });

        // Убираем эффект через 2 секунды
        setTimeout(() => {
          setWinEffect(prev => (prev?.id === effectId ? null : prev));
        }, 2000);
      }

      setTotalWinnings(prev => {
        return selectedCurrency === 'STARS' 
          ? Math.round(prev + ballWinnings)
          : prev + ballWinnings;
      });
    }
  }, [betAmount, selectedCurrency, ballCount]);

  const handlePlay = async () => {
    if (!betAmount || parseFloat(betAmount) <= 0) {
      alert('Please enter a valid bet amount');
      return;
    }

    if (ballCount < 1 || ballCount > 10) {
      alert('Ball count must be between 1 and 10');
      return;
    }

    const totalBet = parseFloat(betAmount) * ballCount;

    // ДЕМО РЕЖИМ - проверяем демо-баланс
    if (isDemoMode) {
      if (demoBalance < totalBet) {
        alert(`Insufficient TON in demo balance! You need ${totalBet} TON`);
        return;
      }
      
      // Списываем с демо-баланса
      removeFromDemoBalance(totalBet);
      
      setIsLoading(true);
      
      // Очищаем очередь перед запуском
      if (window.clearLaunchQueue) {
        window.clearLaunchQueue();
      }
      
      // Генерируем результаты для всех шариков
      const demoResults = [];
      for (let i = 0; i < ballCount; i++) {
        const multiplier = getRandomDemoMultiplier();
        const outcomeIndex = getOutcomeIndexByMultiplier(multiplier);
        demoResults.push({
          multiplier,
          outcome_index: outcomeIndex
        });
      }
      
      console.log('🎮 Демо-режим: результаты:', demoResults);
      
      setTotalWinnings(0);
      setBallsDropped(0);
      setGameState('playing');
      
      // Добавляем все шарики в очередь с правильными пресетами
      demoResults.forEach((result, index) => {
        const preset = getRandomPreset(result.outcome_index);
        if (window.queueLaunchParams) {
          window.queueLaunchParams(preset.x, preset.vx);
        }
      });
      
      // Запускаем шарики
      setTimeout(() => {
        if (plinkoRef.current) {
          for (let i = 0; i < ballCount; i++) {
            setTimeout(() => {
              plinkoRef.current.dropBall();
            }, i * 400);
          }
        }
      }, 100);
      
      setIsLoading(false);
      return;
    }

    // РЕАЛЬНЫЙ РЕЖИМ - проверяем реальный баланс
    if (!checkBalance(selectedCurrency.toLowerCase(), totalBet)) {
      alert(`Insufficient ${selectedCurrency} balance`);
      return;
    }

    setIsLoading(true);

    try {
      const response = await bounceFallApi.play(
        selectedCurrency,
        betAmount,
        ballCount
      );

      console.log('✅ Game started:', response);
      
      setRoundData(response);
      
      if (window.clearLaunchQueue) {
        window.clearLaunchQueue();
      }
      
      response.results.forEach((result, index) => {
        const preset = getRandomPreset(result.outcome_index);
        if (window.queueLaunchParams) {
          window.queueLaunchParams(preset.x, preset.vx);
        }
      });
      
      setTotalWinnings(0);
      setBallsDropped(0);
      setGameState('playing');
      
      if (response.balance) {
        setNewBalances(response.balance);
        window.dispatchEvent(new CustomEvent('balanceUpdate'));
      }
      
      setTimeout(() => {
        if (plinkoRef.current) {
          for (let i = 0; i < ballCount; i++) {
            setTimeout(() => {
              plinkoRef.current.dropBall();
            }, i * 400);
          }
        }
      }, 100);
      
    } catch (error) {
      console.error('Error starting game:', error);
      alert(error.response?.data?.error || 'Failed to start game');
      setGameState('idle');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTakeWinnings = async () => {
    // В демо-режиме добавляем выигрыш к демо-балансу
    if (isDemoMode && totalWinnings > 0) {
      addToDemoBalance(totalWinnings);
    }
    
    setGameState('idle');
    setTotalWinnings(0);
    setBallsDropped(0);
    setRoundData(null);
    
    // В реальном режиме обновляем баланс
    if (!isDemoMode) {
      try {
        await loadBalances();
        window.dispatchEvent(new CustomEvent('balanceUpdate'));
        console.log('✅ Balance updated after taking winnings');
      } catch (error) {
        console.error('Error refreshing balance:', error);
        
        try {
          const balanceResponse = await usersApi.getBalance();
          if (balanceResponse?.balances) {
            setNewBalances(balanceResponse.balances);
            window.dispatchEvent(new CustomEvent('balanceUpdate'));
          }
        } catch (balanceError) {
          console.error('Error refreshing balance directly:', balanceError);
        }
      }
    }
  };

  const handleCurrencySelect = (currency) => {
    setSelectedCurrency(currency);
    setIsDropdownOpen(false);
  };

  const handleBetChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) setBetAmount(value);
  };

  const handleQuickBet = (amount) => setBetAmount(amount.toString());

  const quickBetValues = selectedCurrency === 'TON' 
    ? { first: '1', second: '5' }
    : { first: '50', second: '100' };

  const totalBetAmount = (parseFloat(betAmount) || 0) * ballCount;
  const totalBetFormatted = selectedCurrency === 'STARS' 
    ? Math.round(totalBetAmount)
    : totalBetAmount.toFixed(2);

  // Процент для слайдера
  const sliderPercentage = ((ballCount - 1) / 9) * 100;

  return (
    <div 
      className="plinko-screen"
      style={{
        backgroundImage: `url(${rocketBack})`,
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center'
      }}
    >
      <div className="plinko-header-wrapper">
        <Header onNavigate={onNavigate} variant="plinko" />
      </div>
      
      <main className="plinko-content">
        <div className="plinko-container">
          <div className="plinko-game-area">
            {/* СЛОЙ С ЭФФЕКТАМИ ПОВЕРХ ИГРЫ */}
            {winEffect && (
              <div className={`win-overlay-effect effect-${winEffect.type}`}>
                <div className="win-shimmer"></div>
                <div className="win-multiplier-text">
                  <span className="x-prefix">X</span>
                  {winEffect.multiplier}
                </div>
                <div className="win-flare"></div>
              </div>
            )}

            <NeonPlinko 
              ref={plinkoRef} 
              onBallLand={handleBallLand}
              gameState={gameState}
            />
          </div>
          
          <div className="plinko-controls-section">
            {gameState === 'idle' ? (
              <div className="plinko-idle-controls">
                <div className="plinko-bet-label">Your bet (per ball)</div>
                <div className="plinko-bet-input-container">
                  <div className="plinko-bet-input-wrapper">
                    <span className={`plinko-bet-placeholder ${betAmount ? 'hidden' : ''}`}>Enter</span>
                    <input 
                      type="text" 
                      className="plinko-bet-input"
                      value={betAmount}
                      onChange={handleBetChange}
                      placeholder=""
                      inputMode="decimal"
                      disabled={isLoading}
                    />
                    
                    <div className="plinko-currency-selector" onClick={() => !isLoading && setIsDropdownOpen(!isDropdownOpen)} ref={currencyDropdownRef}>
                      <img src={selectedCurrency === 'TON' ? tonSvg : starSvg} alt={selectedCurrency} className="plinko-currency-icon"/>
                      <img src={isDropdownOpen ? switchSvg : switchbSvg} alt="switch" className="plinko-currency-switch"/>
                      
                      {isDropdownOpen && (
                        <div className="plinko-currency-dropdown">
                          <div className={`plinko-dropdown-item ${selectedCurrency === 'TON' ? 'selected' : ''}`} onClick={() => handleCurrencySelect('TON')}>TON</div>
                          <div className={`plinko-dropdown-item ${selectedCurrency === 'STARS' ? 'selected' : ''}`} onClick={() => handleCurrencySelect('STARS')}>STARS</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="plinko-quick-bet-buttons">
                    <div className={`plinko-quick-bet-button ${isLoading ? 'disabled' : ''}`} onClick={() => !isLoading && handleQuickBet(quickBetValues.first)}>
                      <span className="plinko-quick-bet-value">{quickBetValues.first}</span>
                    </div>
                    <div className={`plinko-quick-bet-button ${isLoading ? 'disabled' : ''}`} onClick={() => !isLoading && handleQuickBet(quickBetValues.second)}>
                      <span className="plinko-quick-bet-value">{quickBetValues.second}</span>
                    </div>
                  </div>
                </div>

                <div className="plinko-balls-selector">
                  <div className="plinko-balls-label">Balls</div>
                  <div className="plinko-balls-slider-container">
                    <div 
                      className="plinko-slider-track"
                      ref={sliderRef}
                      onMouseDown={handleSliderStart}
                      onTouchStart={handleSliderStart}
                    >
                      <div 
                        className="plinko-slider-fill"
                        style={{ width: `${sliderPercentage}%` }}
                      />
                      <div 
                        className={`plinko-slider-thumb ${isDragging ? 'dragging' : ''}`}
                        style={{ left: `${sliderPercentage}%` }}
                      >
                        <span className="plinko-slider-value">{ballCount}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  className="plinko-drop-button"
                  onClick={handlePlay}
                  disabled={isLoading || !betAmount || parseFloat(betAmount) <= 0}
                >
                  {isLoading ? 'LOADING...' : `DROP ${totalBetFormatted} ${selectedCurrency}`}
                </button>
              </div>
            ) : (
              <div className="plinko-active-controls">
                <div className="plinko-game-panel">
                  <div className="plinko-info-row">
                    <div className="plinko-info-label">Your bet</div>
                    <div className="plinko-info-value">
                      <span className="plinko-value-number">{totalBetFormatted}</span>
                      <img src={selectedCurrency === 'TON' ? tonSvg : starSvg} alt={selectedCurrency} className="plinko-panel-currency-icon"/>
                    </div>
                  </div>
                  
                  <div className="plinko-info-row">
                    <div className="plinko-info-label">Balls</div>
                    <div className="plinko-info-value">
                      <span className="plinko-value-number">
                        {ballsDropped} / {ballCount}
                      </span>
                    </div>
                  </div>
                  
                  <div className="plinko-info-row">
                    <div className="plinko-info-label">Winnings</div>
                    <div className="plinko-info-value">
                      <span className="plinko-value-number winnings-highlight">
                        {selectedCurrency === 'STARS' ? Math.round(totalWinnings) : totalWinnings.toFixed(2)}
                      </span>
                      <img src={selectedCurrency === 'TON' ? tonSvg : starSvg} alt={selectedCurrency} className="plinko-panel-currency-icon"/>
                    </div>
                  </div>
                </div>
                
                <button 
                  className={`plinko-action-btn ${gameState === 'playing' ? 'plinko-btn-waiting' : 'plinko-btn-collect'}`}
                  onClick={gameState === 'finished' ? handleTakeWinnings : undefined}
                  disabled={gameState === 'playing'}
                >
                  {gameState === 'playing' ? 'WAITING...' : 'TAKE WINNINGS'}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}