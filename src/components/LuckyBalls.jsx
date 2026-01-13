import '../styles/LuckyBalls.css';
import Header from './Header';
import foot from '../assets/MainPage/foot.png';
import footover from '../assets/MainPage/foot-on.svg';
import closeIcon from '../assets/MainPage/close.png';
import ballsq from '../assets/Lucky/ballsq.png';
import tonSvg from '../assets/MainPage/ton.svg';
import starSvg from '../assets/MainPage/star1.png';
import switchSvg from '../assets/MainPage/switch.svg';
import switchbSvg from '../assets/MainPage/switchd.svg';
import luckyWinIcon from '../assets/Lucky/luckywin.png';
import luckyLoseIcon from '../assets/Lucky/luckylose.png';
import { useEffect, useRef, useState } from 'react';

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
  const [gameState, setGameState] = useState('idle'); // 'idle', 'playing', 'lost', 'won'
  const [currentStep, setCurrentStep] = useState(1); // Текущая активная строка (1-10)
  const [tileStates, setTileStates] = useState({}); // Состояние каждой плитки
  const [winningStep, setWinningStep] = useState(null); // Сгенерированный выигрышный уровень
  const [selectedTiles, setSelectedTiles] = useState([]);
  const [currentPrize, setCurrentPrize] = useState(0);
  
  useEffect(() => {
    // Плавный скролл к активной строке при изменении currentStep
    if (tilesContainerRef.current && rowRefs.current[currentStep]) {
      setTimeout(() => {
        const rowElement = rowRefs.current[currentStep];
        const containerHeight = tilesContainerRef.current.clientHeight;
        const rowTop = rowElement.offsetTop;
        const rowHeight = rowElement.clientHeight;
        
        // Прокручиваем так, чтобы строка была по центру (плавно)
        const targetScroll = rowTop - (containerHeight / 2) + (rowHeight / 2);
        
        tilesContainerRef.current.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
      }, 300);
    }
  }, [currentStep]);

  useEffect(() => {
    // Изначально плавно прокручиваем к первой строке
    if (tilesContainerRef.current && rowRefs.current[1]) {
      setTimeout(() => {
        const rowElement = rowRefs.current[1];
        const containerHeight = tilesContainerRef.current.clientHeight;
        const rowTop = rowElement.offsetTop;
        const rowHeight = rowElement.clientHeight;
        
        const targetScroll = rowTop - (containerHeight / 2) + (rowHeight / 2);
        
        tilesContainerRef.current.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
      }, 100);
    }
    
    // Закрытие dropdown при клике вне его
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

  const handleClose = () => {
    onNavigate('main', currentCardIndex);
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
    // Разрешаем только цифры и точку
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setBetAmount(value);
    }
  };

  const handleQuickBet = (amount) => {
    setBetAmount(amount.toString());
  };

  // Инициализация новой игры
  const initGame = () => {
    if (!betAmount) {
      alert('Please enter bet amount');
      return;
    }
    
    // Генерируем случайный выигрышный уровень от 1 до 10
    const randomWinningStep = Math.floor(Math.random() * 10) + 1;
    setWinningStep(randomWinningStep);
    setGameState('playing');
    setCurrentStep(1);
    setTileStates({});
    setSelectedTiles([]);
    
    const bet = parseFloat(betAmount) || 0;
    // Для STARS - начальный приз округляем до целого
    const initialPrize = selectedCurrency === 'STARS' ? Math.round(bet) : bet;
    setCurrentPrize(initialPrize);
  };

  // Обработка клика на плитку
  const handleTileClick = (row, tile) => {
    if (gameState !== 'playing' || row !== currentStep) return;
    
    const tileKey = `${row}-${tile}`;
    
    // Определяем результат
    const isWin = row <= winningStep;
    
    // Обновляем состояние плитки
    setTileStates(prev => ({
      ...prev,
      [tileKey]: {
        revealed: true,
        isWin: isWin
      }
    }));
    
    // Добавляем плитку в список выбранных
    setSelectedTiles(prev => [...prev, { row, tile, isWin }]);
    
    // Обновляем приз
    const multiplier = parseFloat(multipliers[row].replace('x', ''));
    const bet = parseFloat(betAmount) || 0;
    let newPrize = bet * multiplier;
    
    // Если валюта STARS - округляем до целого числа
    if (selectedCurrency === 'STARS') {
      newPrize = Math.round(newPrize);
    }
    
    setCurrentPrize(newPrize);
    
    // Задержка перед переходом к следующему шагу или завершением игры
    setTimeout(() => {
      if (isWin) {
        // Переход к следующему уровню
        if (currentStep < 10) {
          setCurrentStep(currentStep + 1);
        }
      } else {
        // Проигрыш
        setGameState('lost');
      }
    }, 800);
  };

  // Возврат в начальное состояние
  const handleReturnToStart = () => {
    setGameState('idle');
    setCurrentStep(1);
    setTileStates({});
    setSelectedTiles([]);
    setWinningStep(null);
    setCurrentPrize(0);
  };

  // Множители для каждой строки (от 10 до 1)
  const multipliers = {
    10: '80x',
    9: '30x',
    8: '15x',
    7: '9x',
    6: '5x',
    5: '3.5x',
    4: '2.2x',
    3: '1.8x',
    2: '1.5x',
    1: '1.2x'
  };

  // Значения для быстрых кнопок в зависимости от валюты
  const quickBetValues = selectedCurrency === 'TON' 
    ? { first: '1', second: '5' }
    : { first: '50', second: '100' };

  const renderTiles = () => {
    const rows = [];
    
    // Рендерим строки от 10 до 1 (10 сверху, 1 снизу)
    for (let row = 10; row >= 1; row--) {
      const tiles = [];
      const isActiveRow = row === currentStep && gameState === 'playing';
      const isDisabledRow = row > currentStep || gameState !== 'playing';
      const isCompletedRow = row < currentStep; // Пройденные строки
      
      for (let tile = 1; tile <= 5; tile++) {
        const isRightTile = tile === 5; // Самая правая плитка
        const multiplier = multipliers[row];
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

  const handlePlay = () => {
    initGame();
  };

  return (
    <div className="lucky-balls-screen">
      <Header onNavigate={onNavigate} />

      <main className="lucky-balls-content">
        <div className="lucky-balls-container">
          {/* Игровая зона с плитками */}
          <div className="lucky-balls-game-area">
            <div 
              className="tiles-container"
              ref={tilesContainerRef}
            >
              {renderTiles()}
            </div>
          </div>

          {/* Секция ставки */}
          <div className="bet-section">
            {gameState === 'idle' ? (
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

                  {/* Кнопки быстрого ввода */}
                  <div className="quick-bet-buttons">
                    <div 
                      className="quick-bet-button"
                      onClick={() => handleQuickBet(quickBetValues.first)}
                    >
                      <span className="quick-bet-value">{quickBetValues.first}</span>
                    </div>
                    <div 
                      className="quick-bet-button"
                      onClick={() => handleQuickBet(quickBetValues.second)}
                    >
                      <span className="quick-bet-value">{quickBetValues.second}</span>
                    </div>
                  </div>
                </div>
                
                <button className='play-button-balls' onClick={handlePlay}>
                  PLAY
                </button>
              </>
            ) : (
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
                          ? `-${selectedCurrency === 'STARS' 
                              ? Math.round(parseFloat(betAmount) || 0)
                              : betAmount}`
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
                    {gameState === 'lost' ? 'YOU LOST!' : 'YOU ARE WINNING!'}
                  </div>
                </div>
                
                <button 
                  className={`${gameState === 'lost' ? 'quit-button' : 'take-winnings-button'}`}
                  onClick={handleReturnToStart}
                >
                  {gameState === 'lost' ? 'QUIT' : 'TAKE WINNINGS'}
                </button>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Футер скрывается во время игры */}
      {gameState === 'idle' && (
        <footer className="lucky-balls-footer">
          <div className="footer-close-container">
            <div className="footer-close-item" onClick={handleClose}>
              <div className="footer-close-wrapper">
                <img src={foot} alt="block" className="footer-close-block"/>
                <img src={closeIcon} alt="CLOSE" className="footer-close-icon"/>
                <img src={footover} alt="decoration" className="footer-close-overlay"/>
              </div>
              <span className="footer-close-label">CLOSE</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}