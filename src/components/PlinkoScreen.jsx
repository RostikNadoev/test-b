import React, { useRef, useState, useEffect, useCallback } from 'react';
import NeonPlinko from './NeonPlinko';
import Header from './Header';
import '../styles/PlinkoScreen.css';
import tonSvg from '../assets/MainPage/ton.svg';
import starSvg from '../assets/MainPage/star1.png';
import switchSvg from '../assets/MainPage/switch.svg';
import switchbSvg from '../assets/MainPage/switchd.svg';
import rocketBack from '../assets/Plinko/Back.png';

export default function PlinkoScreen({ onNavigate }) {
  const plinkoRef = useRef();
  const currencyDropdownRef = useRef(null);
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('TON');
  const [betAmount, setBetAmount] = useState('');
  const [ballCount, setBallCount] = useState(1);
  const [gameState, setGameState] = useState('idle'); 
  const [totalWinnings, setTotalWinnings] = useState(0);
  const [ballsDropped, setBallsDropped] = useState(0);

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

      setTotalWinnings(prev => {
        return selectedCurrency === 'STARS' 
          ? Math.round(prev + ballWinnings)
          : prev + ballWinnings;
      });
    }
  }, [betAmount, selectedCurrency, ballCount]);

  const handlePlay = () => {
    if (!betAmount || parseFloat(betAmount) <= 0) return;

    setTotalWinnings(0);
    setBallsDropped(0);
    setGameState('playing');
    
    for (let i = 0; i < ballCount; i++) {
      setTimeout(() => {
        if (plinkoRef.current) plinkoRef.current.dropBall();
      }, i * 300); 
    }
  };

  const handleTakeWinnings = () => {
    setGameState('idle');
    setTotalWinnings(0);
    setBallsDropped(0); 
  };

  const increaseBallCount = () => ballCount < 10 && setBallCount(prev => prev + 1);
  const decreaseBallCount = () => ballCount > 1 && setBallCount(prev => prev - 1);

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

  return (
    <div 
      className="plinko-screen"
      style={{
        backgroundImage: `url(${rocketBack})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center'
      }}
    >
      <Header onNavigate={onNavigate} variant="plinko" />
      
      <main className="plinko-content">
        <div className="plinko-container">
          <div className="plinko-game-area">
            <NeonPlinko 
              ref={plinkoRef} 
              onBallLand={handleBallLand}
              gameState={gameState}
            />
          </div>
          
          <div className="plinko-controls-section">
            {gameState === 'idle' ? (
              <div className="plinko-idle-controls">
                <div className="plinko-bet-label">Your bet</div>
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
                    />
                    
                    <div className="plinko-currency-selector" onClick={() => setIsDropdownOpen(!isDropdownOpen)} ref={currencyDropdownRef}>
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
                    <div className="plinko-quick-bet-button" onClick={() => handleQuickBet(quickBetValues.first)}>
                      <span className="plinko-quick-bet-value">{quickBetValues.first}</span>
                    </div>
                    <div className="plinko-quick-bet-button" onClick={() => handleQuickBet(quickBetValues.second)}>
                      <span className="plinko-quick-bet-value">{quickBetValues.second}</span>
                    </div>
                  </div>
                </div>

                <div className="plinko-balls-selector">
                  <div className="plinko-balls-label">Balls</div>
                  <div className="plinko-balls-counter">
                    <div className={`plinko-ball-control ${ballCount <= 1 ? 'disabled' : ''}`} onClick={decreaseBallCount}>
                      <span className="plinko-control-sign">−</span>
                    </div>
                    <div className="plinko-ball-count-display">{ballCount}</div>
                    <div className={`plinko-ball-control ${ballCount >= 10 ? 'disabled' : ''}`} onClick={increaseBallCount}>
                      <span className="plinko-control-sign">+</span>
                    </div>
                  </div>
                </div>

                <button 
                  className="plinko-drop-button"
                  onClick={handlePlay}
                  disabled={!betAmount || parseFloat(betAmount) <= 0}
                >
                  DROP {totalBetFormatted} {selectedCurrency}
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