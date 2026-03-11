import { useState, useEffect, useCallback, useRef } from 'react';
import { crashWebSocket } from '../utils/websocket';
import api from '../utils/api';

export const useCrashGame = () => {
  // --- Основное состояние игры ---
  const [currentRoundId, setCurrentRoundId] = useState(null);
  const [multiplierNow, setMultiplierNow] = useState(1.0);
  const [roundStatus, setRoundStatus] = useState('waiting');
  
  // --- Таймеры и время ---
  const [timeLeft, setTimeLeft] = useState(15);
  const [stage, setStage] = useState('timer');
  
  // Синхронизация времени
  const [timeOffset, setTimeOffset] = useState(0);
  const [roundStartsAt, setRoundStartsAt] = useState(null);
  const [roundBetsCloseAt, setRoundBetsCloseAt] = useState(null);
  
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
  const isInitializedRef = useRef(false);

  // Синхронизация ref со стейтом
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  // --- СИНХРОНИЗАЦИЯ ВРЕМЕНИ ---
  const syncTime = useCallback((serverTimeMs) => {
    if (!serverTimeMs) return;
    const localNow = Date.now();
    const newOffset = serverTimeMs - localNow;
    
    if (Math.abs(newOffset - timeOffsetRef.current) > 500 || timeOffsetRef.current === 0) {
      console.log(`🕐 Time sync: server=${serverTimeMs}, local=${localNow}, offset=${newOffset}ms`);
      timeOffsetRef.current = newOffset;
      setTimeOffset(newOffset);
    }
  }, []);

  const getServerTime = useCallback(() => {
    return Date.now() + timeOffsetRef.current;
  }, []);

  // --- ФОРМАТИРОВАНИЕ СТАВКИ ---
  const formatBet = useCallback((rawBet) => {
    if (!rawBet) return null;
    
    const winMultiplier =
      rawBet.x ??
      rawBet.multiplier ??
      rawBet.cashout_multiplier ??
      rawBet.CashoutMultiplier ??
      rawBet.payout_multiplier ??
      null;

    let status = rawBet.status || 'placed';

    if ((status === 'cashed_out' || status === 'won') && winMultiplier) {
      status = 'win';
    } else if (status === 'lost') {
      status = 'lose';
    }

    const amount = parseFloat(rawBet.amount || 0);
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
      amount,
      original_amount: amount,
      current_amount: currentAmount,
      status,
      x: winMultiplier ? parseFloat(winMultiplier) : null,
      auto_cashout: rawBet.auto_cashout
    };
  }, []);

  // --- ОБНОВЛЕНИЕ СТЕЙДЖА ПО СТАТУСУ ---
  const updateStageFromStatus = useCallback((status) => {
    console.log(`🎯 updateStageFromStatus: ${status}, current stage: ${stageRef.current}`);
    
    switch (status) {
      case 'betting':
      case 'countdown':
        if (stageRef.current !== 'timer') {
          console.log('⏱️ Setting stage to timer');
          setStage('timer');
        }
        setCrashMultiplier(null);
        setMultiplierNow(1.0);
        break;

      case 'running':
        if (stageRef.current !== 'rocket') {
          console.log('🚀 Setting stage to rocket');
          setStage('rocket');
        }
        break;

      case 'crashed':
        if (stageRef.current !== 'explosion') {
          console.log('💥 Setting stage to explosion');
          setStage('explosion');
        }
        break;

      default:
        if (stageRef.current !== 'timer') {
          setStage('timer');
        }
    }
  }, []);

  // --- ОБРАБОТКА ИНФОРМАЦИИ О РАУНДЕ ---
  const handleRoundInfo = useCallback((roundData, serverTimeMs) => {
    if (!roundData) return;
    
    if (serverTimeMs) syncTime(serverTimeMs);

    console.log('📦 Round info received:', roundData);

    if (roundData.id && roundData.id !== currentRoundId) {
      console.log('🔄 New round detected:', roundData.id);
      setCurrentRoundId(roundData.id);
      hasBetThisRoundRef.current = false;
      setCrashMultiplier(null);
      setMultiplierNow(1.0);
      
      // Не очищаем ставки при новом раунде, только если это действительно новый раунд
      if (currentRoundId) {
        setBetsById(new Map());
        betsRef.current = new Map();
      }
    }

    if (roundData.starts_at) {
      const startsAt = new Date(roundData.starts_at).getTime();
      console.log('⏰ Round starts at:', new Date(startsAt).toISOString(), 'Local:', new Date(getServerTime()).toISOString());
      setRoundStartsAt(startsAt);
    } else {
      setRoundStartsAt(null);
    }

    if (roundData.bets_close_at) {
      setRoundBetsCloseAt(new Date(roundData.bets_close_at).getTime());
    } else {
      setRoundBetsCloseAt(null);
    }

    if (roundData.status) {
      setRoundStatus(roundData.status);
      updateStageFromStatus(roundData.status);
    }
  }, [currentRoundId, syncTime, updateStageFromStatus, getServerTime]);

  // --- ТАЙМЕР (исправленная версия) ---
  useEffect(() => {
    // Очищаем предыдущий интервал
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    console.log('⏲️ Timer effect started', { roundStatus, roundStartsAt });

    const updateTimer = () => {
      const now = getServerTime();
      
      // Если есть время старта и статус подходящий
      if (roundStartsAt && (roundStatus === 'betting' || roundStatus === 'countdown')) {
        const diff = roundStartsAt - now;
        const sec = Math.max(0, Math.ceil(diff / 1000));
        
        if (sec !== timeLeft) {
          setTimeLeft(sec);
        }
        
        if (stageRef.current !== 'timer') {
          console.log('⏱️ Forcing timer stage due to betting/countdown');
          setStage('timer');
        }
        return;
      }
      
      // Если раунд запущен
      if (roundStatus === 'running') {
        setTimeLeft(0);
        if (stageRef.current !== 'rocket') {
          console.log('🚀 Forcing rocket stage due to running');
          setStage('rocket');
        }
        return;
      }
      
      // Если краш
      if (roundStatus === 'crashed') {
        setTimeLeft(0);
        // Не меняем stage, чтобы анимация взрыва завершилась
        return;
      }
      
      // Fallback
      setTimeLeft(15);
    };

    // Запускаем сразу
    updateTimer();
    
    // Запускаем интервал
    timerIntervalRef.current = setInterval(updateTimer, 100);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [roundStartsAt, roundStatus, getServerTime, timeLeft]);

  // --- ВЕБСОКЕТ ---
  const initializeWebSocket = useCallback(async () => {
    if (isInitializedRef.current) return;
    
    try {
      await crashWebSocket.connect();
      setWsConnected(true);
      isInitializedRef.current = true;

      // --- state ---
      crashWebSocket.on('state', (data) => {
        console.log('📥 State received:', data);
        
        if (data.server_time_ms) syncTime(data.server_time_ms);

        if (data.round) {
          handleRoundInfo(data.round, data.server_time_ms);
        }

        if (typeof data.multiplier === 'number') {
          setMultiplierNow(data.multiplier);
        }

        // Обработка ставок
        if (data.bets && Array.isArray(data.bets)) {
          const newBetsMap = new Map();
          data.bets.forEach((bet) => {
            const formatted = formatBet(bet);
            if (formatted) newBetsMap.set(formatted.bet_id, formatted);
          });
          setBetsById(newBetsMap);
          betsRef.current = newBetsMap;
        }

        // Обработка моей ставки
        if (data.my_bet) {
          const formatted = formatBet(data.my_bet);
          if (formatted) {
            setMyActiveBet(formatted);
            myActiveBetRef.current = formatted;
            userIdRef.current = data.my_bet.user_id;
            hasBetThisRoundRef.current = true;
          }
        } else {
          setMyActiveBet(null);
          myActiveBetRef.current = null;
        }
      });

      // --- round ---
      crashWebSocket.on('round', (data) => {
        console.log('📥 Round event:', data);
        setEngineEvents(prev => ({ ...prev, round: data }));
        handleRoundInfo(data.round || data, data.server_time_ms);
      });

      // --- status ---
      crashWebSocket.on('status', (data) => {
        console.log('📥 Status event:', data);
        if (data.server_time_ms) syncTime(data.server_time_ms);
        setEngineEvents(prev => ({ ...prev, status: data }));
        
        if (data.status) {
          setRoundStatus(data.status);
          updateStageFromStatus(data.status);
        }
      });

      // --- tick ---
      crashWebSocket.on('tick', (data) => {
        if (data.server_time_ms) syncTime(data.server_time_ms);
        
        if (data.multiplier) {
          setMultiplierNow(data.multiplier);
          setEngineEvents(prev => ({ ...prev, tick: data }));

          // Обновляем текущие суммы в ставках
          setBetsById(prev => {
            const newMap = new Map(prev);
            newMap.forEach((bet, id) => {
              if (bet.status === 'placed') {
                newMap.set(id, { 
                  ...bet, 
                  current_amount: bet.original_amount * data.multiplier 
                });
              }
            });
            return newMap;
          });

          // Обновляем мою активную ставку
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

      // --- crash ---
      crashWebSocket.on('crash', (data) => {
        console.log('💥 Crash event:', data);
        if (data.server_time_ms) syncTime(data.server_time_ms);
        
        setEngineEvents(prev => ({ ...prev, crash: data }));
        setRoundStatus('crashed');
        setStage('explosion');
        
        const mult = data.multiplier || data.crash_mult || 1.0;
        setCrashMultiplier(mult);
        setLastMultipliers(prev => [mult, ...prev].slice(0, 10));

        // Обновляем все активные ставки на проигрыш
        setBetsById(prev => {
          const newMap = new Map(prev);
          newMap.forEach((bet, id) => {
            if (bet.status === 'placed') {
              newMap.set(id, {
                ...bet,
                status: 'lose',
                x: mult,
                current_amount: bet.original_amount * mult
              });
            }
          });
          betsRef.current = newMap;
          return newMap;
        });

        // НЕ очищаем myActiveBet здесь!
      });

      // --- bet_placed ---
      crashWebSocket.on('bet_placed', (data) => {
        if (data.server_time_ms) syncTime(data.server_time_ms);
        if (!data.bet) return;
        
        const bet = formatBet(data.bet);
        if (bet) {
          setBetsById(prev => new Map(prev).set(bet.bet_id, bet));
        }
      });

      // --- bet_ok ---
      crashWebSocket.on('bet_ok', (data) => {
        console.log('✅ Bet OK:', data);
        if (data.server_time_ms) syncTime(data.server_time_ms);
        
        const bet = formatBet(data.bet);
        if (bet) {
          setMyActiveBet(bet);
          myActiveBetRef.current = bet;
          userIdRef.current = data.bet.user_id;
          hasBetThisRoundRef.current = true;
        }
      });

      // --- cashout_ok ---
      crashWebSocket.on('cashout_ok', (data) => {
        console.log('💰 Cashout OK:', data);
        if (data.server_time_ms) syncTime(data.server_time_ms);
        setEngineEvents(prev => ({ ...prev, cashout_ok: data }));
        
        if (!myActiveBetRef.current) return;
        
        const mult = data.bet?.CashoutMultiplier || data.bet?.cashout_multiplier || multiplierNow;
        const updated = {
          ...myActiveBetRef.current,
          status: 'win',
          x: mult,
          current_amount: myActiveBetRef.current.original_amount * mult
        };
        
        setMyActiveBet(updated);
        myActiveBetRef.current = updated;
        
        // Обновляем в общем списке
        setBetsById(prev => {
          const map = new Map(prev);
          map.set(updated.bet_id, updated);
          return map;
        });
        
        setMyBetsHistory(prev => [updated, ...prev]);
      });

      // --- bet_result (ВАЖНО: обновляем и myActiveBet) ---
      crashWebSocket.on('bet_result', (data) => {
        console.log('📊 Bet result:', data);
        if (data.server_time_ms) syncTime(data.server_time_ms);
        setEngineEvents(prev => ({ ...prev, bet_result: data }));

        // Обновляем в общей таблице
        setBetsById(prev => {
          const map = new Map(prev);
          const existing = map.get(data.bet_id);

          const base = existing || {
            bet_id: data.bet_id,
            id: data.bet_id,
            user_id: data.user_id,
            currency: data.currency,
            amount: data.amount,
            original_amount: data.amount
          };

          const formatted = formatBet({
            ...base,
            status: data.status,
            x: data.x,
            payout: data.payout
          });

          if (formatted) {
            map.set(data.bet_id, formatted);
          }
          
          betsRef.current = map;
          return map;
        });

        // Если это моя ставка - обновляем myActiveBet
        if (myActiveBetRef.current && myActiveBetRef.current.bet_id === data.bet_id) {
          const updated = formatBet({
            ...myActiveBetRef.current,
            status: data.status,
            x: data.x,
            payout: data.payout
          });

          if (updated) {
            setMyActiveBet(updated);
            myActiveBetRef.current = updated;
          }
        }
      });

      // Запрашиваем состояние
      setTimeout(() => {
        crashWebSocket.requestState();
      }, 100);

    } catch (e) {
      console.error('WebSocket Init Error', e);
      setWsConnected(false);
    }
  }, [handleRoundInfo, syncTime, formatBet, updateStageFromStatus, multiplierNow]);

  // Инициализация
  useEffect(() => {
    initializeWebSocket();
    
    return () => {
      crashWebSocket.disconnect();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      isInitializedRef.current = false;
    };
  }, [initializeWebSocket]);

  // --- ОЧИСТКА СТАВОК ПОСЛЕ КРАША (только таблица) ---
  const clearBetsOnCrash = useCallback(() => {
    console.log('🧹 Clearing table after explosion');
    setBetsById(new Map());
    betsRef.current = new Map();
    // НЕ очищаем myActiveBet!
  }, []);

  // --- ДЕЙСТВИЯ ---
  const clearActiveBet = () => {
    setMyActiveBet(null);
    myActiveBetRef.current = null;
  };

  const getHistoryFromBackend = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/crash/history');
      return res.data.items || [];
    } catch (e) { 
      return []; 
    }
  }, []);

  const canPlaceBet = useCallback(() => {
    if (!wsConnected) return false;
    if (myActiveBetRef.current) return false;
    if (hasBetThisRoundRef.current) return false;
    
    const now = getServerTime();
    
    if (roundBetsCloseAt && now >= roundBetsCloseAt) return false;
    if (roundStartsAt && now >= roundStartsAt - 3000) return false;
    if (roundStatus !== 'betting' && roundStatus !== 'countdown') return false;
    
    return true;
  }, [wsConnected, roundBetsCloseAt, roundStartsAt, getServerTime, roundStatus]);

  const canPlaceCashout = useCallback(() => {
    if (!wsConnected) return false;
    if (!myActiveBetRef.current) return false;
    if (myActiveBetRef.current.status === 'win') return false;
    if (roundStatus !== 'running') return false;
    
    return true;
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
    return Array.from(betsById.values()).sort((a, b) => (b.bet_id || 0) - (a.bet_id || 0));
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
    getHistoryFromBackend,
    clearBetsOnCrash
  };
};