import '../styles/LuckyBalls.css';
import Header from './Header';
import ballsq from '../assets/Lucky/ballsq.png';
import tonSvg from '../assets/MainPage/ton.svg';
import starSvg from '../assets/MainPage/star1.png';
import switchSvg from '../assets/MainPage/switch.svg';
import switchbSvg from '../assets/MainPage/switchd.svg';
import luckyWinIcon from '../assets/Lucky/luckywin.png';
import luckyLoseIcon from '../assets/Lucky/luckylose.png';
import { useEffect, useRef, useState } from 'react';
import { luckyBallsApi, authApi } from '../utils/api';
import { useBalance } from '../contexts/BalanceContext';
import { useDemo } from '../contexts/DemoContext';

// Конфигурация для демо-режима
const DEMO_LEVEL_MULTIPLIERS = {
  1: 1.2,
  2: 1.5,
  3: 1.8,
  4: 2.2,
  5: 3.5,
  6: 5,
  7: 9,
  8: 15,
  9: 30,
  10: 80
};

// Шансы на победу для каждого уровня в демо-режиме (%)
const DEMO_WIN_CHANCES = {
  1: 90,   // 90% шанс пройти 1 уровень
  2: 80,   // 80% шанс пройти 2 уровень
  3: 70,   // 70% шанс пройти 3 уровень
  4: 60,   // 60% шанс пройти 4 уровень
  5: 50,   // 50% шанс пройти 5 уровень
  6: 40,   // 40% шанс пройти 6 уровень
  7: 30,   // 30% шанс пройти 7 уровень
  8: 20,   // 20% шанс пройти 8 уровень
  9: 10,   // 10% шанс пройти 9 уровень
  10: 5    // 5% шанс пройти 10 уровень
};

// Функция для определения, выиграл ли игрок на текущем уровне в демо-режиме
const getDemoPickResult = (level) => {
  const chance = DEMO_WIN_CHANCES[level] || 50;
  const random = Math.random() * 100;
  return random <= chance;
};

export default function LuckyBalls({ 
  onNavigate, 
  currentCardIndex = 2  
}) {
  const tilesContainerRef = useRef(null);
  const currencyDropdownRef = useRef(null);
  const betInputRef = useRef(null);
  const rowRefs = useRef({});
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('TON');
  const [betAmount, setBetAmount] = useState('');
  const [gameState, setGameState] = useState('idle');
  const [currentLevel, setCurrentLevel] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [tileStates, setTileStates] = useState({});
  const [selectedTiles, setSelectedTiles] = useState([]);
  const [currentPrize, setCurrentPrize] = useState(0);
  const [activeGameId, setActiveGameId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastPickResult, setLastPickResult] = useState(null);
  const [isScrolling, setIsScrolling] = useState(false);

  const { balances, checkBalance, setNewBalances, loadBalances } = useBalance();
  const { isDemoMode, demoBalance, removeFromDemoBalance, addToDemoBalance } = useDemo();

  useEffect(() => {
    if (!isDemoMode) {
      loadActiveGame();
    }
  }, [isDemoMode]);

  useEffect(() => {
    if (tilesContainerRef.current && rowRefs.current[currentLevel] && !isScrolling) {
      setIsScrolling(true);
      
      const scrollToRow = () => {
        const rowElement = rowRefs.current[currentLevel];
        if (!rowElement || !tilesContainerRef.current) return;
        
        const containerHeight = tilesContainerRef.current.clientHeight;
        const rowTop = rowElement.offsetTop;
        const rowHeight = rowElement.clientHeight;
        
        const targetScroll = Math.max(0, rowTop - (containerHeight / 2) + (rowHeight / 2));
        
        tilesContainerRef.current.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
        
        setTimeout(() => setIsScrolling(false), 500);
      };
      
      const timer = setTimeout(scrollToRow, 100);
      return () => clearTimeout(timer);
    }
  }, [currentLevel]);

  useEffect(() => {
    const initialScroll = setTimeout(() => {
      if (tilesContainerRef.current && rowRefs.current[1]) {
        const rowElement = rowRefs.current[1];
        if (rowElement) {
          const containerHeight = tilesContainerRef.current.clientHeight;
          const rowTop = rowElement.offsetTop;
          const rowHeight = rowElement.clientHeight;
          
          const targetScroll = Math.max(0, rowTop - (containerHeight / 2) + (rowHeight / 2));
          
          tilesContainerRef.current.scrollTo({
            top: targetScroll,
            behavior: 'smooth'
          });
        }
      }
    }, 300);
    
    const handleClickOutside = (event) => {
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      clearTimeout(initialScroll);
    };
  }, []);

  const loadActiveGame = async () => {
    if (isDemoMode) return;
    
    try {
      setIsLoading(true);
      const response = await luckyBallsApi.getActiveGame();
      
      if (response.active && response.game) {
        const game = response.game;
        setActiveGameId(game.id);
        setSelectedCurrency(game.currency.toUpperCase());
        setBetAmount(game.bet.toString());
        setCurrentLevel(game.level);
        setMultiplier(game.multiplier);
        setGameState(game.status === 'active' ? 'playing' : game.status);
        
        const prize = game.bet * game.multiplier;
        setCurrentPrize(selectedCurrency === 'STARS' ? Math.round(prize) : prize);
      }
    } catch (error) {
      console.error('Error loading active game:', error);
    } finally {
      setIsLoading(false);
    }
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

  const handlePlay = async () => {
    if (!betAmount || parseFloat(betAmount) <= 0) {
      alert('Please enter a valid bet amount');
      return;
    }

    if (isLoading) return;

    const bet = parseFloat(betAmount);

    // ДЕМО РЕЖИМ
    if (isDemoMode) {
      if (demoBalance < bet) {
        alert(`Insufficient TON in demo balance! You need ${bet} TON`);
        return;
      }
      
      // Списываем с демо-баланса
      removeFromDemoBalance(bet);
      
      setIsLoading(true);
      
      // Запускаем демо-игру с ПЕРВОГО уровня
      setActiveGameId('demo_' + Date.now());
      setCurrentLevel(1); // Начинаем с 1 уровня
      setMultiplier(DEMO_LEVEL_MULTIPLIERS[1]);
      setGameState('playing');
      setTileStates({});
      setSelectedTiles([]);
      setLastPickResult(null);
      
      const prize = bet * DEMO_LEVEL_MULTIPLIERS[1];
      setCurrentPrize(selectedCurrency === 'STARS' ? Math.round(prize) : prize);
      
      setTimeout(() => setIsLoading(false), 500);
      return;
    }

    // РЕАЛЬНЫЙ РЕЖИМ
    try {
      setIsLoading(true);
      
      const currency = selectedCurrency.toLowerCase();
      
      // Проверяем баланс через контекст
      if (!checkBalance(currency, bet)) {
        alert(`Insufficient ${selectedCurrency} balance`);
        setIsLoading(false);
        return;
      }

      const response = await luckyBallsApi.startGame(currency, bet);
      
      if (response.game) {
        const game = response.game;
        setActiveGameId(game.id);
        setCurrentLevel(game.level);
        setMultiplier(game.multiplier);
        setGameState('playing');
        setTileStates({});
        setSelectedTiles([]);
        setLastPickResult(null);
        
        // Обновляем балансы через контекст
        if (response.balance) {
          setNewBalances(response.balance);
          
          // Отправляем событие обновления баланса
          window.dispatchEvent(new CustomEvent('balanceUpdate'));
        }
        
        const prize = game.bet * game.multiplier;
        setCurrentPrize(selectedCurrency === 'STARS' ? Math.round(prize) : prize);
      }
    } catch (error) {
      console.error('Error starting game:', error);
      if (error.response?.data?.error) {
        alert(`Error: ${error.response.data.error}`);
      } else {
        alert('Failed to start game. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTileClick = async (row, tile) => {
    if (gameState !== 'playing' || row !== currentLevel + 1 || isLoading || isScrolling) return;
    
    // ДЕМО РЕЖИМ
    if (isDemoMode) {
      setIsLoading(true);
      
      // Определяем результат на основе шансов для текущего уровня
      const isWin = getDemoPickResult(currentLevel);
      
      const tileKey = `${row}-${tile}`;
      setTileStates(prev => ({
        ...prev,
        [tileKey]: {
          revealed: true,
          isWin: isWin
        }
      }));
      
      setSelectedTiles(prev => [...prev, { row, tile, isWin: isWin }]);
      setLastPickResult({ is_win: isWin });
      
      if (isWin) {
        // Переход на следующий уровень
        const nextLevel = currentLevel + 1;
        
        if (nextLevel <= 10) {
          // Есть следующий уровень
          const nextMultiplier = DEMO_LEVEL_MULTIPLIERS[nextLevel] || 1;
          
          setMultiplier(nextMultiplier);
          setCurrentLevel(nextLevel);
          
          const bet = parseFloat(betAmount) || 0;
          const newPrize = bet * nextMultiplier;
          setCurrentPrize(selectedCurrency === 'STARS' ? Math.round(newPrize) : newPrize);
          
          setTimeout(() => {
            setGameState('playing');
            setIsLoading(false);
          }, 800);
        } else {
          // Дошли до 10 уровня и выиграли - максимум
          setCurrentPrize(prev => prev); // Оставляем текущий приз
          
          setTimeout(() => {
            setGameState('cashed_out'); // Автоматически забираем выигрыш
            setIsLoading(false);
          }, 800);
        }
      } else {
        // Проигрыш
        setCurrentPrize(0);
        
        setTimeout(() => {
          setGameState('lost');
          setIsLoading(false);
        }, 800);
      }
      
      return;
    }

    // РЕАЛЬНЫЙ РЕЖИМ
    if (!activeGameId) {
      alert('No active game found');
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await luckyBallsApi.pickBall(activeGameId, tile);
      
      if (response.result) {
        const { is_win, board } = response.result;
        setLastPickResult({ is_win, board });
        
        const tileKey = `${row}-${tile}`;
        setTileStates(prev => ({
          ...prev,
          [tileKey]: {
            revealed: true,
            isWin: is_win
          }
        }));
        
        setSelectedTiles(prev => [...prev, { row, tile, isWin: is_win }]);
        
        if (response.game) {
          const game = response.game;
          
          if (is_win) {
            setMultiplier(game.multiplier);
            setCurrentLevel(game.level);
            
            const bet = parseFloat(betAmount) || 0;
            const newPrize = bet * game.multiplier;
            setCurrentPrize(selectedCurrency === 'STARS' ? Math.round(newPrize) : newPrize);
            
            setTimeout(() => {
              setGameState('playing');
            }, 800);
          } else {
            setMultiplier(game.multiplier);
            setCurrentLevel(game.level);
            setCurrentPrize(0);
            
            setTimeout(() => {
              setGameState('lost');
            }, 800);
          }
        }
      }
    } catch (error) {
      console.error('Error picking ball:', error);
      if (error.response?.data?.error) {
        alert(`Error: ${error.response.data.error}`);
      } else {
        alert('Failed to pick ball. Please try again.');
      }
    } finally {
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  const handleCashout = async () => {
    if (!activeGameId || gameState !== 'playing') return;
    
    if (isLoading || isScrolling) return;

    // ДЕМО РЕЖИМ
    if (isDemoMode) {
      // Добавляем выигрыш к демо-балансу
      if (currentPrize > 0) {
        addToDemoBalance(currentPrize);
      }
      
      setGameState('cashed_out');
      alert(`Successfully cashed out ${currentPrize} ${selectedCurrency}!`);
      return;
    }

    // РЕАЛЬНЫЙ РЕЖИМ
    try {
      setIsLoading(true);
      
      const response = await luckyBallsApi.cashout(activeGameId);
      
      if (response.game) {
        const game = response.game;
        setGameState('cashed_out');
        setCurrentLevel(game.level);
        setMultiplier(game.multiplier);
        
        if (game.payout) {
          setCurrentPrize(game.payout);
        }
        
        // Обновляем балансы через контекст
        if (response.balance) {
          setNewBalances(response.balance);
          
          // Отправляем событие обновления баланса
          window.dispatchEvent(new CustomEvent('balanceUpdate'));
        }
        
        alert(`Successfully cashed out ${game.payout} ${selectedCurrency}!`);
      }
    } catch (error) {
      console.error('Error cashing out:', error);
      if (error.response?.data?.error) {
        alert(`Error: ${error.response.data.error}`);
      } else {
        alert('Failed to cashout. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetGame = () => {
    setGameState('idle');
    setCurrentLevel(0);
    setMultiplier(1);
    setTileStates({});
    setSelectedTiles([]);
    setActiveGameId(null);
    setLastPickResult(null);
    setCurrentPrize(0);
  };

  const levelMultipliers = {
    1: '1.2x',
    2: '1.5x',
    3: '1.8x',
    4: '2.2x',
    5: '3.5x',
    6: '5x',
    7: '9x',
    8: '15x',
    9: '30x',
    10: '80x'
  };

  const quickBetValues = selectedCurrency === 'TON' 
    ? { first: '1', second: '5' }
    : { first: '50', second: '100' };

  const renderTiles = () => {
    const rows = [];
    
    for (let row = 10; row >= 1; row--) {
      const tiles = [];
      const isCurrentLevel = row === currentLevel + 1;
      const isActiveRow = isCurrentLevel && gameState === 'playing';
      const isCompletedRow = row <= currentLevel;
      const isDisabledRow = row > currentLevel + 1 || gameState !== 'playing';
      
      for (let tile = 1; tile <= 5; tile++) {
        const isRightTile = tile === 5;
        const multiplier = levelMultipliers[row];
        const tileKey = `${row}-${tile}`;
        const tileState = tileStates[tileKey];
        const isRevealed = tileState?.revealed;
        const isWin = tileState?.isWin;
        
        tiles.push(
          <div 
            key={`tile-${row}-${tile}`}
            className={`tile ${isActiveRow ? 'active' : ''} ${isDisabledRow ? 'disabled' : ''} ${isCompletedRow ? 'completed' : ''}`}
            data-row={row}
            data-tile={tile}
            onClick={() => handleTileClick(row, tile)}
          >
            <div className={`tile-inner ${isRevealed ? 'flipped' : ''}`}>
              <div className="tile-front">
                <img src={ballsq} alt="ball" className="tile-ball" />
                <span className="tile-question">?</span>
                {isRightTile && (
                  <div className="tile-multiplier">
                    {multiplier}
                  </div>
                )}
              </div>
              <div className={`tile-back ${isWin ? 'win' : 'lose'}`}>
                <div className="tile-result-icon">
                  <img 
                    src={isWin ? luckyWinIcon : luckyLoseIcon} 
                    alt={isWin ? "win" : "lose"} 
                    className="tile-icon"
                  />
                </div>
                {isRightTile && (
                  <div className="tile-multiplier">
                    {multiplier}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }
      
      rows.push(
        <div 
          key={`row-${row}`}
          className={`tiles-row ${isActiveRow ? 'active-row' : ''} ${isDisabledRow ? 'disabled-row' : ''} ${isCompletedRow ? 'completed-row' : ''}`}
          data-row={row}
          ref={el => rowRefs.current[row] = el}
        >
          {tiles}
        </div>
      );
    }
    
    return rows;
  };

  const renderGameInfo = () => {
    if (gameState === 'idle') {
      return (
        <>
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
                disabled={isLoading}
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

            <div className="quick-bet-buttonsl">
              <div 
                className="quick-bet-buttonl"
                onClick={() => !isLoading && handleQuickBet(quickBetValues.first)}
              >
                <span className="quick-bet-value">{quickBetValues.first}</span>
              </div>
              <div 
                className="quick-bet-buttonl"
                onClick={() => !isLoading && handleQuickBet(quickBetValues.second)}
              >
                <span className="quick-bet-value">{quickBetValues.second}</span>
              </div>
            </div>
          </div>
          
          <button 
            className='play-button-ballsl' 
            onClick={handlePlay}
            disabled={isLoading || !betAmount || parseFloat(betAmount) <= 0}
          >
            {isLoading ? 'STARTING...' : 'PLAY'}
          </button>
        </>
      );
    } else {
      return (
        <>
          <div className={`game-info-panel ${gameState === 'lost' ? 'lost' : ''}`}>
            <div className="info-row">
              <div className="info-label">Your bet</div>
              <div className="info-value">
                <span className="value-number">
                  {selectedCurrency === 'STARS' 
                    ? Math.round(parseFloat(betAmount) || 0)
                    : betAmount}
                </span>
                <img 
                  src={selectedCurrency === 'TON' ? tonSvg : starSvg} 
                  alt={selectedCurrency} 
                  className="panel-currency-icon"
                />
              </div>
            </div>
            
            <div className="info-row">
              <div className="info-label">Current winnings</div>
              <div className="info-value">
                <span className="value-number">
                  {gameState === 'lost' 
                    ? '0'
                    : (selectedCurrency === 'STARS' 
                        ? Math.round(currentPrize)
                        : currentPrize.toFixed(2)
                      )
                  }
                </span>
                <img 
                  src={selectedCurrency === 'TON' ? tonSvg : starSvg} 
                  alt={selectedCurrency} 
                  className="panel-currency-icon"
                />
              </div>
            </div>
            
            <div className="status-message">
              {gameState === 'lost' 
                ? 'YOU LOST!' 
                : gameState === 'cashed_out' 
                  ? 'CASHED OUT!' 
                  : `LEVEL ${currentLevel}`}
            </div>
          </div>
          
          {gameState === 'playing' && (
            <button 
              className="take-winnings-button"
              onClick={handleCashout}
              disabled={isLoading || isScrolling}
            >
              {isLoading ? 'CASHING OUT...' : 'TAKE WINNINGS'}
            </button>
          )}
          
          {(gameState === 'lost' || gameState === 'cashed_out') && (
            <button 
              className="quit-button"
              onClick={handleResetGame}
              disabled={isLoading}
            >
              NEW GAME
            </button>
          )}
        </>
      );
    }
  };

  return (
    <div className="lucky-balls-screen">
      <Header onNavigate={onNavigate} />

      <main className="lucky-balls-content">
        <div className="lucky-balls-container">
          {isLoading && (
            <div className="loading-overlay fixed">
              <div className="loading-spinner"></div>
            </div>
          )}

          <div className="lucky-balls-game-area">
            <div 
              className="tiles-container"
              ref={tilesContainerRef}
            >
              {renderTiles()}
            </div>
          </div>

          <div className="bet-section fixed-height">
            {renderGameInfo()}
          </div>
        </div>
      </main>
    </div>
  );
}