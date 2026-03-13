import { useState, useEffect, useCallback, useRef } from 'react';
import { crashWebSocket } from '../utils/websocket';
import api from '../utils/api';

export const useCrashGame = () => {
  // --- Основное состояние игры ---
  const [currentRoundId, setCurrentRoundId] = useState(null);
  const [multiplierNow, setMultiplierNow] = useState(1.0);
  const [roundStatus, setRoundStatus] = useState('waiting');
  // --- Таймеры и время (ТОЛЬКО ИЗ WEBSOCKET) ---
  const [timeLeft, setTimeLeft] = useState(15); // Будет обновляться из timer сообщений
  const [stage, setStage] = useState('timer');
  // Для точной синхронизации времени
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
  const clearTableTimeoutRef = useRef(null);
  const explosionCleanupTimeoutRef = useRef(null); // Для очистки анимации взрыва
  const betsRef = useRef(new Map());
  const myActiveBetRef = useRef(null);
  const userIdRef = useRef(null);
  const hasBetThisRoundRef = useRef(false);
  const timeOffsetRef = useRef(0);
  const stageRef = useRef('timer');
  
  // Refs для автокешаута
  const autoCashoutTargetRef = useRef(null);
  const autoCashoutTriggeredRef = useRef(false);
  const AUTO_CASHOUT_BUFFER = 0.02;

  // Синхронизация ref со стейтом
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  // --- 1. ЛОГИКА СИНХРОНИЗАЦИИ ВРЕМЕНИ ---
  const syncTime = useCallback((serverTimeMs) => {
    if (!serverTimeMs) return;
    const localNow = Date.now();
    const newOffset = serverTimeMs - localNow;
    if (Math.abs(newOffset - timeOffsetRef.current) > 500 || timeOffsetRef.current === 0) {
      timeOffsetRef.current = newOffset;
      setTimeOffset(newOffset);
    }
  }, []);

  const getServerTime = useCallback(() => {
    return Date.now() + timeOffsetRef.current;
  }, []);

  // --- 2. ОБРАБОТКА TIMER СООБЩЕНИЙ (НОВОЕ) ---
  const handleTimerMessage = useCallback((data) => {
    // Синхронизируем время с сервером
    if (data.server_time_ms) syncTime(data.server_time_ms);
    
    // Обновляем round_id если пришел новый
    if (data.round_id && data.round_id !== currentRoundId) {
      setCurrentRoundId(data.round_id);
      hasBetThisRoundRef.current = false;
    }
    
    // Обновляем betting_locked статус
    if (data.betting_locked !== undefined) {
      // Можем использовать для дополнительной логики
    }
    
    // Обновляем таймер - ИСПОЛЬЗУЕМ ПРЯМОЕ ЗНАЧЕНИЕ С СЕРВЕРА
    if (data.sec !== undefined) {
      setTimeLeft(data.sec);
      
      // Логирование как в оригинале
      if (data.sec <= 5 && data.sec > 0) {
        console.log(`⏱️ Server timer: ${data.sec}s remaining`);
      }
    }
    
    // Обновляем время закрытия ставок
    if (data.seconds_to_bets_close !== undefined && roundStartsAt) {
      // Можно использовать для точности
    }
    
    // ВАЖНО: Если мы в стадии взрыва и пришло timer сообщение - переключаемся на таймер
    if (stageRef.current === 'explosion') {
      // Очищаем таймер на очистку взрыва
      if (explosionCleanupTimeoutRef.current) {
        clearTimeout(explosionCleanupTimeoutRef.current);
        explosionCleanupTimeoutRef.current = null;
      }
      
      // Переключаемся на таймер
      setStage('timer');
    }
  }, [currentRoundId, syncTime, roundStartsAt]);

  // --- 3. ОЧИСТКА ВЗРЫВА ПО ТАЙМЕРУ (НОВОЕ) ---
  useEffect(() => {
    // Если произошел краш, устанавливаем таймер на принудительную очистку взрыва
    // на случай, если timer сообщение не придет
    if (engineEvents.crash) {
      if (explosionCleanupTimeoutRef.current) {
        clearTimeout(explosionCleanupTimeoutRef.current);
      }
      
      // Через 3 секунды принудительно выходим из взрыва если не пришло timer сообщение
      explosionCleanupTimeoutRef.current = setTimeout(() => {
        if (stageRef.current === 'explosion') {
          console.log('⚠️ Forcing explosion cleanup - no timer message received');
          setStage('timer');
        }
        explosionCleanupTimeoutRef.current = null;
      }, 3000);
    }
    
    return () => {
      if (explosionCleanupTimeoutRef.current) {
        clearTimeout(explosionCleanupTimeoutRef.current);
      }
    };
  }, [engineEvents.crash]);

  // --- 4. ОЧИСТКА ТАБЛИЦЫ ЧЕРЕЗ 1.9с ПОСЛЕ КРАША (КАК В ОРИГИНАЛЕ) ---
  useEffect(() => {
    if (engineEvents.crash) {
      // Очищаем предыдущий таймер если есть
      if (clearTableTimeoutRef.current) {
        clearTimeout(clearTableTimeoutRef.current);
      }
      
      // Запускаем таймер на 1.9 секунды
      clearTableTimeoutRef.current = setTimeout(() => {
        console.log('🧹 Clearing bets table 1.9s after crash');
        setBetsById(new Map());
        betsRef.current = new Map();
        setMyActiveBet(null);
        myActiveBetRef.current = null;
        clearTableTimeoutRef.current = null;
      }, 2000);
    }
    
    return () => {
      if (clearTableTimeoutRef.current) {
        clearTimeout(clearTableTimeoutRef.current);
      }
    };
  }, [engineEvents.crash]);

  // --- 5. ЛОГИКА АВТОКЕШАУТА (ТОЛЬКО НА ФРОНТЕ) ---
  useEffect(() => {
    if (stage === 'rocket' &&
        myActiveBetRef.current &&
        myActiveBetRef.current.status === 'placed' &&
        autoCashoutTargetRef.current !== null &&
        !autoCashoutTriggeredRef.current) {
      const currentMultiplier = multiplierNow;
      const targetMultiplier = autoCashoutTargetRef.current;
      const triggerMultiplier = targetMultiplier - AUTO_CASHOUT_BUFFER;
      
      if (currentMultiplier >= triggerMultiplier) {
        console.log(`🎯 Auto-cashout triggered at x${currentMultiplier.toFixed(2)} (target: x${targetMultiplier}, buffer: ${AUTO_CASHOUT_BUFFER})`);
        autoCashoutTriggeredRef.current = true;
        crashWebSocket.cashout(myActiveBetRef.current.bet_id);
      }
    }
  }, [multiplierNow, stage, myActiveBetRef.current]);

  useEffect(() => {
    if (currentRoundId) {
      autoCashoutTargetRef.current = null;
      autoCashoutTriggeredRef.current = false;
    }
  }, [currentRoundId]);

  useEffect(() => {
    if (engineEvents.cashout_ok || engineEvents.crash) {
      autoCashoutTargetRef.current = null;
      autoCashoutTriggeredRef.current = false;
    }
  }, [engineEvents.cashout_ok, engineEvents.crash]);

  // --- 6. HELPERS ДЛЯ ФОРМАТИРОВАНИЯ ---
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
    };
  }, []);

  // --- 7. УПРАВЛЕНИЕ ДАННЫМИ РАУНДА ---
  const updateStageFromStatus = useCallback((status) => {
    switch (status) {
      case 'betting':
      case 'countdown':
        setStage('timer');
        setCrashMultiplier(null);
        setMultiplierNow(1.0);
        if (hasBetThisRoundRef.current && !myActiveBetRef.current) {
          hasBetThisRoundRef.current = false;
        }
        break;
      case 'running':
        setStage('rocket');
        setMultiplierNow(1.0);
        break;
      case 'crashed':
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
      hasBetThisRoundRef.current = false;
    }
    
    if (roundData.starts_at) {
      const startsAtTime = new Date(roundData.starts_at).getTime();
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

  // --- 8. WS INIT (ОСНОВНЫЕ ИЗМЕНЕНИЯ ЗДЕСЬ) ---
  const initializeWebSocket = useCallback(async () => {
    try {
      await crashWebSocket.connect();
      setWsConnected(true);
      
      // Обработчик для timer сообщений (ВАЖНО: добавляем до остальных)
      crashWebSocket.on('timer', (data) => {
        setEngineEvents(prev => ({ ...prev, countdown: data }));
        handleTimerMessage(data);
      });
      
      crashWebSocket.on('state', (data) => {
        if (data.server_time_ms) syncTime(data.server_time_ms);
        if (data.round) {
          handleRoundInfo(data.round, data.server_time_ms);
        }
        if (data.multiplier) setMultiplierNow(data.multiplier);
        if (data.bets && Array.isArray(data.bets)) {
          const newBetsMap = new Map();
          data.bets.forEach(bet => {
            const formatted = formatBet(bet);
            newBetsMap.set(formatted.bet_id, formatted);
          });
          setBetsById(newBetsMap);
          betsRef.current = newBetsMap;
        }
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
        setStage('explosion');
        const mult = data.multiplier || data.crash_mult || 1.0;
        setCrashMultiplier(mult);
        setLastMultipliers(prev => [mult, ...prev].slice(0, 10));
        
        // Обновляем статусы ставок
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
          setMyActiveBet(null);
          myActiveBetRef.current = null;
        }
      });
      
      crashWebSocket.on('bet_placed', (data) => {
        if (data.server_time_ms) syncTime(data.server_time_ms);
        if (data.round_id !== currentRoundId) {
          setCurrentRoundId(data.round_id);
          hasBetThisRoundRef.current = false;
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
        setBetsById(prev => {
          const map = new Map(prev);
          const id = updated.bet_id;
          if (map.has(id)) map.set(id, updated);
          return map;
        });
        setMyBetsHistory(prev => [updated, ...prev]);
        hasBetThisRoundRef.current = true;
      });
      
      crashWebSocket.on('bet_result', (data) => {
        if (data.server_time_ms) syncTime(data.server_time_ms);
        setEngineEvents(prev => ({ ...prev, bet_result: data }));
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
  }, [currentRoundId, handleRoundInfo, syncTime, formatBet, updateStageFromStatus, handleTimerMessage]);

  useEffect(() => {
    initializeWebSocket();
    return () => {
      crashWebSocket.disconnect();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (clearTableTimeoutRef.current) clearTimeout(clearTableTimeoutRef.current);
      if (explosionCleanupTimeoutRef.current) clearTimeout(explosionCleanupTimeoutRef.current);
    };
  }, [initializeWebSocket]);

  // --- 9. УДАЛЯЕМ СТАРЫЙ ЛОКАЛЬНЫЙ ТАЙМЕР ---
  // useEffect с локальным таймером БОЛЬШЕ НЕ НУЖЕН, так как мы используем timer сообщения

  // --- ACTIONS ---
  const clearActiveBet = () => {
    setMyActiveBet(null);
    myActiveBetRef.current = null;
  };
  
  const clearAllBets = () => {
    setBetsById(new Map());
    betsRef.current = new Map();
  };
  
  const getHistoryFromBackend = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/crash/history');
      return res.data.items || [];
    } catch (e) { return []; }
  }, []);
  
  const canPlaceBet = useCallback(() => {
    if (!wsConnected || myActiveBetRef.current) return false;
    if (hasBetThisRoundRef.current) return false;
    const now = getServerTime();
    if (roundBetsCloseAt) {
      if (now >= roundBetsCloseAt) return false;
    } else if (roundStartsAt) {
      if (now >= roundStartsAt - 3000) return false;
    }
    if (roundStatus !== 'betting' && roundStatus !== 'countdown') return false;
    return true;
  }, [wsConnected, roundBetsCloseAt, roundStartsAt, getServerTime, roundStatus]);
  
  const canPlaceCashout = useCallback(() => {
    if (myActiveBetRef.current?.status === 'win') return false;
    return roundStatus === 'running' && wsConnected && !!myActiveBetRef.current;
  }, [roundStatus, wsConnected]);
  
  const placeBet = useCallback((currency, amount, autoCashoutTarget) => {
    if (!canPlaceBet()) return false;
    hasBetThisRoundRef.current = true;
    if (autoCashoutTarget && autoCashoutTarget > 1.0) {
      autoCashoutTargetRef.current = autoCashoutTarget;
      autoCashoutTriggeredRef.current = false;
    } else {
      autoCashoutTargetRef.current = null;
      autoCashoutTriggeredRef.current = false;
    }
    return crashWebSocket.placeBet(currency, amount, null);
  }, [canPlaceBet]);
  
  const cashoutBet = useCallback(() => {
    if (!myActiveBetRef.current) return false;
    autoCashoutTargetRef.current = null;
    autoCashoutTriggeredRef.current = false;
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
    getHistoryFromBackend
  };
};