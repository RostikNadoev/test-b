import { useState, useEffect, useCallback, useRef } from 'react';
import { crashWebSocket } from '../utils/websocket';
import api from '../utils/api';

export const useCrashGame = () => {
  // --- Основное состояние игры ---
  const [currentRoundId, setCurrentRoundId] = useState(null);
  const [multiplierNow, setMultiplierNow] = useState(1.0);
  const [roundStatus, setRoundStatus] = useState('waiting');
  
  // --- Таймеры и время (СЕРВЕРНЫЙ ТАЙМЕР) ---
  const [timeLeft, setTimeLeft] = useState(15);
  const [stage, setStage] = useState('timer');
  
  // Для точной синхронизации: храним разницу (ServerTime - LocalTime)
  const [timeOffset, setTimeOffset] = useState(0);
  const [roundStartsAt, setRoundStartsAt] = useState(null);     // timestamp ms
  const [roundBetsCloseAt, setRoundBetsCloseAt] = useState(null); // timestamp ms
  
  const [crashMultiplier, setCrashMultiplier] = useState(null);
  const [lastMultipliers, setLastMultipliers] = useState([]);
  
  // --- Ставки ---
  const [betsById, setBetsById] = useState(new Map());
  const [myActiveBet, setMyActiveBet] = useState(null);
  const [myBetsHistory, setMyBetsHistory] = useState([]);
  
  // --- События движка ---
  const [engineEvents, setEngineEvents] = useState({
    crash: null,
    tick: null,
    countdown: null,
    round: null,
    status: null,
    cashout_ok: null,
    bet_result: null
  });

  const [wsConnected, setWsConnected] = useState(false);
  
  // Refs
  const timerIntervalRef = useRef(null);
  const betsRef = useRef(new Map());
  const myActiveBetRef = useRef(null);
  const userIdRef = useRef(null);
  const hasBetThisRoundRef = useRef(false);
  const timeOffsetRef = useRef(0);
  const stageRef = useRef('timer');

  // Синхронизация ref со стейтом
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  // --- 1. ЛОГИКА СИНХРОНИЗАЦИИ ВРЕМЕНИ ---

  const syncTime = useCallback((serverTimeMs) => {
    if (!serverTimeMs) return;
    const localNow = Date.now();
    const newOffset = serverTimeMs - localNow;
    
    // Сглаживание: обновляем только если рассинхрон больше 500мс или это первая синхронизация
    if (Math.abs(newOffset - timeOffsetRef.current) > 500 || timeOffsetRef.current === 0) {
      console.log(`⏱️ Time sync: server=${serverTimeMs}, local=${localNow}, offset=${newOffset}ms`);
      timeOffsetRef.current = newOffset;
      setTimeOffset(newOffset);
    }
  }, []);

  const getServerTime = useCallback(() => {
    return Date.now() + timeOffsetRef.current;
  }, []);

  // --- 2. ТАЙМЕР ОБРАТНОГО ОТСЧЕТА (СЕРВЕРНЫЙ) ---
  useEffect(() => {
    // Очищаем предыдущий интервал
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    // Функция обновления таймера
    const updateTimer = () => {
      const now = getServerTime();
      
      if (roundStartsAt) {
        const diff = roundStartsAt - now;
        const sec = Math.max(0, Math.ceil(diff / 1000));
        
        // Обновляем timeLeft
        setTimeLeft(sec);
        
        // Логируем для отладки (можно убрать в продакшене)
        if (sec <= 5 && sec > 0) {
          console.log(`⏱️ Server timer: ${sec}s remaining (starts at ${new Date(roundStartsAt).toISOString()})`);
        }
        
        // Определяем stage на основе diff и roundStatus
        if (diff > 0 && (roundStatus === 'betting' || roundStatus === 'countdown')) {
          if (stageRef.current !== 'timer') {
            setStage('timer');
          }
        }
      } else {
        // Fallback если нет времени старта
        setTimeLeft(15);
      }
    };

    // Запускаем интервал с частотой 100мс для плавности
    timerIntervalRef.current = setInterval(updateTimer, 100);

    // Первоначальное обновление
    updateTimer();

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [roundStartsAt, roundStatus, getServerTime]);

  // --- 3. HELPERS ДЛЯ ФОРМАТИРОВАНИЯ ---

  const formatBet = useCallback((rawBet) => {
    const winMultiplier = rawBet.x || rawBet.multiplier || rawBet.cashout_multiplier || rawBet.payout_multiplier || null;
    
    let status = rawBet.status || 'placed';
    if (winMultiplier && parseFloat(winMultiplier) > 1 && status === 'placed') {
       status = 'win';
    }

    const amount = parseFloat(rawBet.amount);
    let currentAmount = amount;

    if (status === 'win' && winMultiplier) {
        currentAmount = amount * parseFloat(winMultiplier);
    } else if (status === 'lose' && winMultiplier) {
        currentAmount = amount * parseFloat(winMultiplier);
    }

    return {
      bet_id: rawBet.bet_id || rawBet.id,
      id: rawBet.bet_id || rawBet.id,
      user_id: rawBet.user_id,
      user: rawBet.user || {},
      currency: rawBet.currency,
      amount: amount,
      original_amount: amount,
      current_amount: currentAmount,
      status: status,
      x: winMultiplier ? parseFloat(winMultiplier) : null,
      auto_cashout: rawBet.auto_cashout
    };
  }, []);

  // --- 4. УПРАВЛЕНИЕ ДАННЫМИ РАУНДА ---

  const updateStageFromStatus = useCallback((status) => {
    switch (status) {
      case 'betting':
      case 'countdown':
        setStage('timer');
        setCrashMultiplier(null);
        setMultiplierNow(1.0);
        // При переходе в betting точно можно ставить
        if (hasBetThisRoundRef.current && !myActiveBetRef.current) {
            hasBetThisRoundRef.current = false;
        }
        break;
      case 'running':
        setStage('rocket');
        setMultiplierNow(1.0);
        break;
      case 'crashed':
        // Не переключаем stage здесь, чтобы не прерывать анимацию взрыва
        break;
      default:
        setStage('timer');
    }
  }, []);

  const handleRoundInfo = useCallback((roundData, serverTimeMs) => {
    if (serverTimeMs) syncTime(serverTimeMs);

    if (roundData.id && roundData.id !== currentRoundId) {
      console.log('🔄 New round detected:', roundData.id);
      setCurrentRoundId(roundData.id);
      
      // СБРОС ФЛАГА ПРИ НОВОМ РАУНДЕ
      hasBetThisRoundRef.current = false;
      
      // ОЧИЩАЕМ ТАБЛИЦУ ПРИ НОВОМ РАУНДЕ
      clearAllBets();
      clearActiveBet();
    }

    if (roundData.starts_at) {
      const startsAtTime = new Date(roundData.starts_at).getTime();
      console.log(`⏱️ Round starts at: ${new Date(startsAtTime).toISOString()} (${startsAtTime})`);
      setRoundStartsAt(startsAtTime);
    }

    if (roundData.bets_close_at) {
      setRoundBetsCloseAt(new Date(roundData.bets_close_at).getTime());
    }

    if (roundData.status) {
      setRoundStatus(roundData.status);
      updateStageFromStatus(roundData.status);
    }
  }, [currentRoundId, syncTime, updateStageFromStatus]);

  // --- 5. WS INIT ---

  const initializeWebSocket = useCallback(async () => {
    try {
      await crashWebSocket.connect();
      setWsConnected(true);

      crashWebSocket.on('state', (data) => {
        if (data.server_time_ms) syncTime(data.server_time_ms);
        
        if (data.round) {
          handleRoundInfo(data.round, data.server_time_ms);
        }

        if (data.multiplier) setMultiplierNow(data.multiplier);

        // Обработка списка ставок при входе
        if (data.bets && Array.isArray(data.bets)) {
          const newBetsMap = new Map();
          data.bets.forEach(bet => {
            const formatted = formatBet(bet);
            const betId = formatted.bet_id;
            newBetsMap.set(betId, formatted);
          });
          setBetsById(newBetsMap);
          betsRef.current = newBetsMap;
        }

        // Обработка моей ставки при входе
        if (data.my_bet) {
          const formatted = formatBet(data.my_bet);
          setMyActiveBet(formatted);
          myActiveBetRef.current = formatted;
          userIdRef.current = data.my_bet.user_id;
          
          if (formatted.status === 'win' || formatted.status === 'placed') {
              hasBetThisRoundRef.current = true;
          }
        }
      });

      crashWebSocket.on('round', (data) => {
        setEngineEvents(prev => ({ ...prev, round: data }));
        const roundInfo = data.round || data; 
        handleRoundInfo(roundInfo, data.server_time_ms);
      });

      crashWebSocket.on('status', (data) => {
        if (data.server_time_ms) syncTime(data.server_time_ms);
        setEngineEvents(prev => ({ ...prev, status: data }));
        
        if (data.status) {
          setRoundStatus(data.status);
          updateStageFromStatus(data.status);
        }
      });

      crashWebSocket.on('tick', (data) => {
        if (data.server_time_ms) syncTime(data.server_time_ms);
        
        if (data.multiplier) {
          setMultiplierNow(data.multiplier);
          setEngineEvents(prev => ({ ...prev, tick: data }));

          setBetsById(prev => {
            const newMap = new Map(prev);
            newMap.forEach((bet, id) => {
              if (bet.status === 'placed') {
                newMap.set(id, { ...bet, current_amount: bet.original_amount * data.multiplier });
              }
            });
            return newMap;
          });

          if (myActiveBetRef.current?.status === 'placed') {
             const updated = { 
                 ...myActiveBetRef.current, 
                 current_amount: myActiveBetRef.current.original_amount * data.multiplier 
             };
             setMyActiveBet(updated);
             myActiveBetRef.current = updated;
          }
        }
      });

      crashWebSocket.on('crash', (data) => {
        console.log('💥 Crash event:', data);
        if (data.server_time_ms) syncTime(data.server_time_ms);
        
        setEngineEvents(prev => ({ ...prev, crash: data }));
        setRoundStatus('crashed');
        
        // Взрыв запускаем только здесь
        setStage('explosion');
        
        const mult = data.multiplier || data.crash_mult || 1.0;
        setCrashMultiplier(mult);
        
        setLastMultipliers(prev => [mult, ...prev].slice(0, 10));

        // Обновляем ставки на проигрыш
        setBetsById(prev => {
          const newMap = new Map(prev);
          newMap.forEach((bet, id) => {
            if (bet.status === 'placed') {
              newMap.set(id, { ...bet, status: 'lose', x: mult, current_amount: bet.original_amount * mult });
            }
          });
          betsRef.current = newMap;
          return newMap;
        });

        if (myActiveBetRef.current?.status === 'placed') {
          clearActiveBet();
        }
      });

      crashWebSocket.on('bet_placed', (data) => {
        if (data.server_time_ms) syncTime(data.server_time_ms);
        if (data.round_id !== currentRoundId) {
             setCurrentRoundId(data.round_id);
             // Сброс флага при чужой ставке в новом раунде
             hasBetThisRoundRef.current = false;
             clearAllBets();
        }
        const bet = formatBet(data.bet);
        setBetsById(prev => new Map(prev).set(bet.bet_id, bet));
      });

      crashWebSocket.on('bet_ok', (data) => {
        if (data.server_time_ms) syncTime(data.server_time_ms);
        const bet = formatBet(data.bet);
        setMyActiveBet(bet);
        myActiveBetRef.current = bet;
        userIdRef.current = data.bet.user_id;
        hasBetThisRoundRef.current = true;
      });

      crashWebSocket.on('cashout_ok', (data) => {
        if (data.server_time_ms) syncTime(data.server_time_ms);
        setEngineEvents(prev => ({ ...prev, cashout_ok: data }));
        
        const mult = data.bet.CashoutMultiplier || data.bet.cashout_multiplier || multiplierNow;
        const updated = {
            ...myActiveBetRef.current,
            status: 'win',
            x: mult,
            current_amount: myActiveBetRef.current.original_amount * mult
        };
        setMyActiveBet(updated);
        myActiveBetRef.current = updated;
        
        // Обновляем в общем списке тоже
        setBetsById(prev => {
            const map = new Map(prev);
            const id = updated.bet_id;
            if (map.has(id)) {
                map.set(id, updated);
            }
            return map;
        });
        
        setMyBetsHistory(prev => [updated, ...prev]);
        hasBetThisRoundRef.current = true;
      });

      crashWebSocket.on('bet_result', (data) => {
        if (data.server_time_ms) syncTime(data.server_time_ms);
        
        setEngineEvents(prev => ({ ...prev, bet_result: data }));
        
        // Универсальное обновление для чужих и своих ставок
        setBetsById(prev => {
            const map = new Map(prev);
            const b = map.get(data.bet_id);
            if (b) {
                const tempBet = { ...b, status: data.status, x: data.x };
                const formatted = formatBet(tempBet);
                map.set(data.bet_id, formatted);
            }
            return map;
        });
        
        // Обновляем myActiveBet, если это наша ставка
        if (myActiveBetRef.current && myActiveBetRef.current.bet_id === data.bet_id) {
          const updated = formatBet({
            ...myActiveBetRef.current,
            status: data.status,
            x: data.x,
            payout: data.payout
          });

          setMyActiveBet(updated);
          myActiveBetRef.current = updated;
        }
      });

      setTimeout(() => crashWebSocket.requestState(), 100);

    } catch (e) {
      console.error('WebSocket Init Error', e);
      setWsConnected(false);
    }
  }, [currentRoundId, handleRoundInfo, syncTime, formatBet, updateStageFromStatus]);

  useEffect(() => {
    initializeWebSocket();
    return () => {
      crashWebSocket.disconnect();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [initializeWebSocket]);

  // --- ACTIONS ---

  const clearActiveBet = () => {
    setMyActiveBet(null);
    myActiveBetRef.current = null;
  };

  const clearAllBets = () => {
    setBetsById(new Map());
    betsRef.current = new Map();
  };

  const clearBetsOnCrash = useCallback(() => {
    console.log('🧹 Clearing table after explosion');
    setBetsById(new Map());
    betsRef.current = new Map();
    // Не трогаем myActiveBet
  }, []);

  const getHistoryFromBackend = useCallback(async () => {
     try {
       const res = await api.get('/api/v1/crash/history');
       return res.data.items || [];
     } catch (e) { return []; }
  }, []);

  const canPlaceBet = useCallback(() => {
    if (!wsConnected || myActiveBetRef.current) return false;
    
    // Если флаг стоит, значит в этом раунде уже участвовали
    if (hasBetThisRoundRef.current) return false;
    
    const now = getServerTime();
    
    // Проверка времени
    if (roundBetsCloseAt) {
      if (now >= roundBetsCloseAt) return false;
    } else if (roundStartsAt) {
      if (now >= roundStartsAt - 3000) return false;
    }

    // Проверка статуса
    if (roundStatus !== 'betting' && roundStatus !== 'countdown') return false;
    
    return true;
  }, [wsConnected, roundBetsCloseAt, roundStartsAt, getServerTime, roundStatus]);

  const canPlaceCashout = useCallback(() => {
    if (myActiveBetRef.current?.status === 'win') return false;
    return roundStatus === 'running' && wsConnected && !!myActiveBetRef.current;
  }, [roundStatus, wsConnected]);

  const placeBet = useCallback((currency, amount, autoCashout) => {
    if (!canPlaceBet()) return false;
    hasBetThisRoundRef.current = true;
    return crashWebSocket.placeBet(currency, amount, autoCashout);
  }, [canPlaceBet]);

  const cashoutBet = useCallback(() => {
    if (!myActiveBetRef.current) return false;
    return crashWebSocket.cashout(myActiveBetRef.current.bet_id);
  }, []);

  const getCurrentBets = useCallback(() => {
    return Array.from(betsById.values()).sort((a,b) => (b.bet_id || 0) - (a.bet_id || 0));
  }, [betsById]);

  return {
    currentRoundId,
    multiplierNow,
    roundStatus,
    timeLeft,
    stage,
    setStage,
    wsConnected,
    crashMultiplier,
    lastMultipliers: lastMultipliers || [],
    bets: getCurrentBets(),
    myActiveBet,
    engineEvents,
    placeBet,
    cashoutBet,
    canBet: canPlaceBet(),
    canCashout: canPlaceCashout(),
    isCrashGameActive: wsConnected,
    isBettingPhase: roundStatus === 'betting',
    isFlyingPhase: roundStatus === 'running',
    getHistoryFromBackend,
    clearBetsOnCrash
  };
};